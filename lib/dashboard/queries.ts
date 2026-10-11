import "server-only";

import type { Db } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type {
  AvailabilityBreakdown,
  CategoryCount,
  CityCount,
  CollectionKey,
  CollectionStat,
  DashboardData,
  Insight,
  RatingBucket,
} from "@/lib/dashboard/types";

const COLLECTION_LABELS: Record<CollectionKey, string> = {
  businesses: "Businesses",
  reviews: "Reviews",
  users: "Users",
  tips: "Tips",
  checkins: "Check-ins",
};

const EXPECTED_COLLECTIONS: CollectionKey[] = [
  "businesses",
  "reviews",
  "users",
  "tips",
  "checkins",
];

/**
 * Resolve which of the expected collections actually exist. We never present a
 * missing collection as an imported-but-empty one, so availability is derived
 * from the real list of collection names, not from a count of zero.
 */
async function getCollectionStats(db: Db): Promise<CollectionStat[]> {
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (c) => c.name,
    ),
  );

  // For each existing collection, use estimatedDocumentCount(): it reads
  // collection metadata instead of scanning documents, which is the only sane
  // choice for headline totals on multi-million-document collections.
  const stats = await Promise.all(
    EXPECTED_COLLECTIONS.map(async (key): Promise<CollectionStat> => {
      const available = existing.has(key);
      let count: number | null = null;
      if (available) {
        count = await db.collection(key).estimatedDocumentCount();
      }
      return { key, label: COLLECTION_LABELS[key], available, count };
    }),
  );

  return stats;
}

/** Average of businesses.stars, computed database-side. */
async function getAverageRating(db: Db): Promise<number | null> {
  const [row] = await db
    .collection("businesses")
    .aggregate<{ avg: number }>(
      [
        { $match: { stars: { $type: "number" } } },
        { $group: { _id: null, avg: { $avg: "$stars" } } },
      ],
      { allowDiskUse: false },
    )
    .toArray();
  return row ? Number(row.avg.toFixed(4)) : null;
}

/**
 * Count businesses per star rating. Grouping happens entirely in MongoDB, so
 * only ~9 small buckets ever cross the wire. Sorted numerically ascending.
 */
async function getRatingDistribution(db: Db): Promise<RatingBucket[]> {
  const rows = await db
    .collection("businesses")
    .aggregate<{ _id: number; count: number }>(
      [
        { $match: { stars: { $type: "number" } } },
        { $group: { _id: "$stars", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ],
      { allowDiskUse: false },
    )
    .toArray();

  return rows.map((r) => ({
    rating: r._id,
    label: r._id.toFixed(1),
    count: r.count,
  }));
}

/**
 * Top categories. The `categories` field is a comma-separated STRING, so the
 * pipeline splits it, trims each name, unwinds, and groups. All of this runs
 * database-side; only the top 10 rows are returned.
 */
async function getTopCategories(db: Db): Promise<CategoryCount[]> {
  const rows = await db
    .collection("businesses")
    .aggregate<{ _id: string; count: number }>(
      [
        // 1. Keep only documents with a usable category string.
        { $match: { categories: { $type: "string", $ne: "" } } },
        // 2+3. Split on commas, then trim whitespace from each fragment.
        {
          $project: {
            cats: {
              $map: {
                input: { $split: ["$categories", ","] },
                as: "c",
                in: { $trim: { input: "$$c" } },
              },
            },
          },
        },
        // 4. Unwind to one row per category.
        { $unwind: "$cats" },
        // Drop empties that can result from trailing commas.
        { $match: { cats: { $ne: "" } } },
        // 5. Group and count.
        { $group: { _id: "$cats", count: { $sum: 1 } } },
        // 6. Sort by frequency.
        { $sort: { count: -1, _id: 1 } },
        // 7. Keep the top 10.
        { $limit: 10 },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  return rows.map((r) => ({ category: r._id, count: r.count }));
}

/**
 * Open vs closed. is_open is 1 (open) or 0 (closed); anything else is counted
 * as "unknown" and excluded from the ratio so the denominator stays meaningful.
 */
async function getAvailability(db: Db): Promise<AvailabilityBreakdown> {
  const rows = await db
    .collection("businesses")
    .aggregate<{ _id: "open" | "closed" | "unknown"; count: number }>(
      [
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ["$is_open", 1] }, then: "open" },
                  { case: { $eq: ["$is_open", 0] }, then: "closed" },
                ],
                default: "unknown",
              },
            },
            count: { $sum: 1 },
          },
        },
      ],
      { allowDiskUse: false },
    )
    .toArray();

  let open = 0;
  let closed = 0;
  let unknown = 0;
  for (const r of rows) {
    if (r._id === "open") open = r.count;
    else if (r._id === "closed") closed = r.count;
    else unknown += r.count;
  }
  const known = open + closed;
  return {
    open,
    closed,
    unknown,
    openRatio: known > 0 ? open / known : 0,
  };
}

/**
 * Top cities grouped by city AND state together, since the same city name can
 * exist in multiple states. Returns the top 10. Grouping is database-side.
 */
async function getTopCities(db: Db): Promise<CityCount[]> {
  const rows = await db
    .collection("businesses")
    .aggregate<{ _id: { city: string; state: string }; count: number }>(
      [
        {
          $match: {
            city: { $type: "string", $ne: "" },
          },
        },
        {
          $group: {
            _id: { city: "$city", state: "$state" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, "_id.city": 1 } },
        { $limit: 10 },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  return rows.map((r) => {
    const city = r._id.city ?? "";
    const state = r._id.state ?? "";
    return {
      city,
      state,
      label: state ? `${city}, ${state}` : city,
      count: r.count,
    };
  });
}

/** Derive up to three insights from the already-computed aggregation results. */
function buildInsights(parts: {
  topCategories: CategoryCount[];
  topCities: CityCount[];
  availability: AvailabilityBreakdown;
}): Insight[] {
  const insights: Insight[] = [];

  const topCategory = parts.topCategories[0];
  if (topCategory) {
    insights.push({
      id: "top-category",
      label: "Most common category",
      value: topCategory.category,
      detail: `${topCategory.count.toLocaleString("en-US")} businesses listed under this category.`,
    });
  }

  const topCity = parts.topCities[0];
  if (topCity) {
    insights.push({
      id: "top-city",
      label: "Densest market",
      value: topCity.label,
      detail: `${topCity.count.toLocaleString("en-US")} businesses in this city.`,
    });
  }

  const { open, closed, openRatio } = parts.availability;
  if (open + closed > 0) {
    insights.push({
      id: "open-share",
      label: "Currently open",
      value: `${Math.round(openRatio * 100)}%`,
      detail: `${open.toLocaleString("en-US")} of ${(open + closed).toLocaleString("en-US")} businesses with a known status are open.`,
    });
  }

  return insights;
}

/**
 * Produce the complete dashboard payload.
 *
 * Independent read-only aggregations run concurrently. Every query is bounded:
 * counts use metadata estimates, and all chart data is grouped/limited inside
 * MongoDB, so no collection is ever streamed into application memory. Review
 * text is never read.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const db = await getDb();

  // Collection stats first — if `businesses` is missing we still want a valid
  // (empty) payload rather than a thrown error.
  const collections = await getCollectionStats(db);
  const businessesAvailable =
    collections.find((c) => c.key === "businesses")?.available ?? false;

  if (!businessesAvailable) {
    return {
      collections,
      averageRating: null,
      ratingDistribution: [],
      topCategories: [],
      availability: { open: 0, closed: 0, unknown: 0, openRatio: 0 },
      topCities: [],
      insights: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const [averageRating, ratingDistribution, topCategories, availability, topCities] =
    await Promise.all([
      getAverageRating(db),
      getRatingDistribution(db),
      getTopCategories(db),
      getAvailability(db),
      getTopCities(db),
    ]);

  const insights = buildInsights({ topCategories, topCities, availability });

  return {
    collections,
    averageRating,
    ratingDistribution,
    topCategories,
    availability,
    topCities,
    insights,
    generatedAt: new Date().toISOString(),
  };
}
