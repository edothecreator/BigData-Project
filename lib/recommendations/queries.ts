import "server-only";

import type { Db, Document } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type {
  RecommendationResult,
  RecommendationSeed,
  RecommendationStrategy,
  RecommendedBusiness,
  SeedOption,
} from "@/lib/recommendations/types";

const BUSINESSES = "businesses";
const REVIEWS = "reviews";

/** Escape regex metacharacters so user input is matched literally. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitCategories(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const name = part.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

function toStatus(isOpen: unknown): RecommendedBusiness["status"] {
  if (isOpen === 1) return "open";
  if (isOpen === 0) return "closed";
  return "unknown";
}

interface RawBusiness {
  business_id: string;
  name?: string;
  city?: string;
  state?: string;
  categories?: string;
  stars?: number;
  review_count?: number;
  is_open?: number;
}

const BUSINESS_PROJECTION = {
  _id: 0,
  business_id: 1,
  name: 1,
  city: 1,
  state: 1,
  categories: 1,
  stars: 1,
  review_count: 1,
  is_open: 1,
} as const;

function mapBusiness(
  r: RawBusiness,
  score: number,
  reason: string,
): RecommendedBusiness {
  return {
    businessId: r.business_id,
    name: r.name ?? "(unnamed business)",
    city: r.city ?? "",
    state: r.state ?? "",
    categories: splitCategories(r.categories),
    stars: typeof r.stars === "number" ? r.stars : null,
    reviewCount: typeof r.review_count === "number" ? r.review_count : 0,
    status: toStatus(r.is_open),
    score,
    reason,
  };
}

/** Fetch the seed business (minimal fields). Returns null if not found. */
async function getSeed(
  db: Db,
  businessId: string,
): Promise<(RawBusiness & { catList: string[] }) | null> {
  const doc = await db
    .collection(BUSINESSES)
    .findOne<RawBusiness>({ business_id: businessId }, {
      projection: BUSINESS_PROJECTION,
    });
  if (!doc) return null;
  return { ...doc, catList: splitCategories(doc.categories) };
}

/**
 * CONTENT-BASED recommender.
 *
 * "Businesses similar to this one" by shared categories. We prefer same-state
 * candidates (local relevance) that share at least one category, and rank by
 * number of shared categories, then rating, then review volume. Everything runs
 * in MongoDB; only the top N small docs are returned.
 *
 * The `categories` field is a comma-separated STRING, so we split/trim it into
 * an array in the pipeline, then use $setIntersection against the seed's set.
 */
async function recommendContent(
  db: Db,
  seed: RawBusiness & { catList: string[] },
  limit: number,
): Promise<RecommendedBusiness[]> {
  if (seed.catList.length === 0) return [];

  const match: Document = {
    business_id: { $ne: seed.business_id },
    categories: { $type: "string", $ne: "" },
  };
  // Prefer same-state candidates for local relevance.
  if (seed.state) match.state = seed.state;

  const rows = await db
    .collection(BUSINESSES)
    .aggregate<RawBusiness & { shared: number }>(
      [
        { $match: match },
        {
          $project: {
            ...BUSINESS_PROJECTION,
            cats: {
              $map: {
                input: { $split: ["$categories", ","] },
                as: "c",
                in: { $trim: { input: "$$c" } },
              },
            },
          },
        },
        {
          $addFields: {
            shared: {
              $size: { $setIntersection: ["$cats", seed.catList] },
            },
          },
        },
        { $match: { shared: { $gte: 1 } } },
        {
          $sort: {
            shared: -1,
            stars: -1,
            review_count: -1,
            business_id: 1,
          },
        },
        { $limit: limit },
        { $project: { cats: 0 } },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  return rows.map((r) =>
    mapBusiness(
      r,
      r.shared,
      `${r.shared} shared ${r.shared === 1 ? "category" : "categories"}`,
    ),
  );
}

/**
 * COLLABORATIVE recommender — "people who reviewed this also reviewed...".
 *
 * Step 1: find a bounded set of users who reviewed the seed business.
 * Step 2: group all OTHER businesses those users reviewed, counting common
 *         reviewers; take the top N.
 * Step 3: hydrate the top N business ids with their display fields.
 *
 * Requires indexes reviews.business_id and reviews.user_id (see
 * scripts/ensure-indexes.js). Without them this is far too slow on 7M reviews,
 * so the caller falls back to content-based. No user identity or review text is
 * ever returned — only aggregate co-review counts.
 */
async function recommendCollaborative(
  db: Db,
  seed: RawBusiness,
  limit: number,
): Promise<RecommendedBusiness[]> {
  const reviews = db.collection(REVIEWS);

  // Step 1: bounded reviewer set for the seed.
  const reviewerDocs = await reviews
    .find(
      { business_id: seed.business_id },
      { projection: { _id: 0, user_id: 1 }, limit: 400 },
    )
    .toArray();

  const userIds = Array.from(
    new Set(
      reviewerDocs
        .map((d) => (d as { user_id?: string }).user_id)
        .filter((u): u is string => typeof u === "string"),
    ),
  );
  if (userIds.length === 0) return [];

  // Step 2: co-reviewed businesses, counted.
  const grouped = await reviews
    .aggregate<{ _id: string; coReviewers: number }>(
      [
        {
          $match: {
            user_id: { $in: userIds },
            business_id: { $ne: seed.business_id },
          },
        },
        { $group: { _id: "$business_id", coReviewers: { $sum: 1 } } },
        { $sort: { coReviewers: -1, _id: 1 } },
        { $limit: limit },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  if (grouped.length === 0) return [];

  // Step 3: hydrate the small set of ids with display fields.
  const ids = grouped.map((g) => g._id);
  const businesses = await db
    .collection(BUSINESSES)
    .find<RawBusiness>(
      { business_id: { $in: ids } },
      { projection: BUSINESS_PROJECTION },
    )
    .toArray();

  const byId = new Map(businesses.map((b) => [b.business_id, b]));

  // Preserve the co-reviewer ranking from step 2.
  const out: RecommendedBusiness[] = [];
  for (const g of grouped) {
    const b = byId.get(g._id);
    if (!b) continue;
    out.push(
      mapBusiness(
        b,
        g.coReviewers,
        `${g.coReviewers} common ${g.coReviewers === 1 ? "reviewer" : "reviewers"}`,
      ),
    );
  }
  return out;
}

/** Whether the reviews indexes needed for collaborative mode are present. */
async function hasReviewIndexes(db: Db): Promise<boolean> {
  try {
    const idx = await db.collection(REVIEWS).indexes();
    const keys = idx.map((i) => JSON.stringify(i.key));
    return (
      keys.includes(JSON.stringify({ business_id: 1 })) &&
      keys.includes(JSON.stringify({ user_id: 1 }))
    );
  } catch {
    return false;
  }
}

/** Produce recommendations for a seed business using the requested strategy. */
export async function getRecommendations(
  businessId: string,
  strategy: RecommendationStrategy,
  limit: number,
): Promise<RecommendationResult | null> {
  const db = await getDb();

  const seedRaw = await getSeed(db, businessId);
  if (!seedRaw) return null;

  const seed: RecommendationSeed = {
    businessId: seedRaw.business_id,
    name: seedRaw.name ?? "(unnamed business)",
    city: seedRaw.city ?? "",
    state: seedRaw.state ?? "",
    categories: seedRaw.catList,
    stars: typeof seedRaw.stars === "number" ? seedRaw.stars : null,
  };

  let effectiveStrategy: RecommendationStrategy = strategy;
  let fallbackReason: string | null = null;
  let items: RecommendedBusiness[] = [];

  if (strategy === "collaborative") {
    const indexed = await hasReviewIndexes(db);
    if (!indexed) {
      // Honest fallback rather than a slow/hanging request.
      effectiveStrategy = "content";
      fallbackReason =
        "Collaborative mode needs indexes on the reviews collection. Run scripts/ensure-indexes.js. Showing content-based results instead.";
      items = await recommendContent(db, seedRaw, limit);
    } else {
      items = await recommendCollaborative(db, seedRaw, limit);
      if (items.length === 0) {
        effectiveStrategy = "content";
        fallbackReason =
          "Not enough co-review signal for this business. Showing content-based results instead.";
        items = await recommendContent(db, seedRaw, limit);
      }
    }
  } else {
    items = await recommendContent(db, seedRaw, limit);
  }

  return {
    seed,
    strategy,
    effectiveStrategy,
    fallbackReason,
    items,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Search businesses to use as a seed. Name-prefix/substring (escaped regex),
 * ranked by review volume so recognizable businesses surface first.
 */
export async function searchSeeds(
  search: string | undefined,
  limit: number,
): Promise<SeedOption[]> {
  const db = await getDb();
  const match: Document = {};
  if (search) {
    match.name = { $regex: escapeRegex(search), $options: "i" };
  }

  const rows = await db
    .collection(BUSINESSES)
    .aggregate<RawBusiness>(
      [
        { $match: match },
        { $sort: { review_count: -1, business_id: 1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            business_id: 1,
            name: 1,
            city: 1,
            state: 1,
            stars: 1,
            review_count: 1,
          },
        },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  return rows.map((r) => ({
    businessId: r.business_id,
    name: r.name ?? "(unnamed business)",
    city: r.city ?? "",
    state: r.state ?? "",
    stars: typeof r.stars === "number" ? r.stars : null,
    reviewCount: typeof r.review_count === "number" ? r.review_count : 0,
  }));
}
