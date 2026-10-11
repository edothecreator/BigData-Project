import "server-only";

import type { Document, Filter } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { ListQuery } from "@/lib/businesses/schema";
import type {
  BusinessDetail,
  BusinessListItem,
  BusinessListResult,
  BusinessSortField,
  BusinessStatus,
  FilterOptions,
} from "@/lib/businesses/types";
import { normalizeAttributeValue, prettifyAttributeKey } from "@/lib/businesses/attributes";

const COLLECTION = "businesses";
const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Escape regex metacharacters so user input is treated literally. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split the comma-separated categories string into trimmed, non-empty names. */
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

function toStatus(isOpen: unknown): BusinessStatus {
  if (isOpen === 1) return "open";
  if (isOpen === 0) return "closed";
  return "unknown";
}

/**
 * Build the MongoDB filter from validated query params. This single function is
 * the ONE source of truth for the active filter, shared by the list query, the
 * total count, and the summary aggregation — so counts and summaries can never
 * drift from the rows shown in the table.
 */
export function buildBusinessFilter(query: ListQuery): Filter<Document> {
  const filter: Filter<Document> = {};

  if (query.search) {
    // Case-insensitive, literal (escaped) substring match on the name only.
    filter.name = { $regex: escapeRegex(query.search), $options: "i" };
  }

  if (query.state) {
    filter.state = query.state;
  }

  if (query.city) {
    // Exact (case-insensitive) city match, anchored to avoid partial hits.
    filter.city = { $regex: `^${escapeRegex(query.city)}$`, $options: "i" };
  }

  if (query.category) {
    // Match a WHOLE category within the comma-separated string, not a stray
    // substring: require a comma/string boundary on both sides.
    const cat = escapeRegex(query.category);
    filter.categories = {
      $regex: `(^|,\\s*)${cat}(\\s*,|$)`,
      $options: "i",
    };
  }

  if (query.minRating > 0) {
    filter.stars = { $gte: query.minRating };
  }

  if (query.status === "open") filter.is_open = 1;
  else if (query.status === "closed") filter.is_open = 0;

  return filter;
}

/** Map a validated sort field to its MongoDB sort key with a stable tiebreak. */
function buildSort(
  field: BusinessSortField,
  direction: 1 | -1,
): Record<string, 1 | -1> {
  // `business_id` is unique, so appending it guarantees a total order and makes
  // pagination deterministic (no repeated or skipped rows across pages).
  switch (field) {
    case "name":
      return { name: direction, business_id: 1 };
    case "stars":
      return { stars: direction, business_id: 1 };
    case "review_count":
      return { review_count: direction, business_id: 1 };
    case "city":
      return { city: direction, state: direction, business_id: 1 };
    default:
      return { business_id: 1 };
  }
}

interface RawListRow {
  business_id: string;
  name?: string;
  city?: string;
  state?: string;
  categories?: string;
  stars?: number;
  review_count?: number;
  is_open?: number;
}

/**
 * Run the paged list query and the summary aggregation concurrently. Both use
 * the identical filter from buildBusinessFilter. Projection keeps only the
 * fields the table needs; `_id` is excluded entirely.
 */
export async function getBusinessList(
  query: ListQuery,
): Promise<BusinessListResult> {
  const db = await getDb();
  const coll = db.collection(COLLECTION);

  const filter = buildBusinessFilter(query);
  const dir: 1 | -1 = query.direction === "asc" ? 1 : -1;
  const sort = buildSort(query.sort, dir);
  const skip = (query.page - 1) * query.pageSize;

  const listPromise = coll
    .aggregate<RawListRow>(
      [
        { $match: filter },
        { $sort: sort },
        { $skip: skip },
        { $limit: query.pageSize },
        {
          $project: {
            _id: 0,
            business_id: 1,
            name: 1,
            city: 1,
            state: 1,
            categories: 1,
            stars: 1,
            review_count: 1,
            is_open: 1,
          },
        },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  // Exact total for the current filter. countDocuments respects the same
  // filter object, so the table total and summary total always agree.
  const totalPromise = coll.countDocuments(filter);

  // Summary over the FULL filtered set (not just the page).
  const summaryPromise = coll
    .aggregate<{ count: number; avg: number | null; open: number }>(
      [
        { $match: filter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avg: { $avg: "$stars" },
            open: {
              $sum: { $cond: [{ $eq: ["$is_open", 1] }, 1, 0] },
            },
            known: {
              $sum: {
                $cond: [{ $in: ["$is_open", [0, 1]] }, 1, 0],
              },
            },
          },
        },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  const [rows, total, summaryRows] = await Promise.all([
    listPromise,
    totalPromise,
    summaryPromise,
  ]);

  const summaryRow = summaryRows[0];
  const openCount = summaryRow?.open ?? 0;
  const known =
    (summaryRow as { known?: number } | undefined)?.known ?? 0;

  const items: BusinessListItem[] = rows.map((r) => ({
    businessId: r.business_id,
    name: r.name ?? "(unnamed business)",
    city: r.city ?? "",
    state: r.state ?? "",
    categories: splitCategories(r.categories),
    stars: typeof r.stars === "number" ? r.stars : null,
    reviewCount: typeof r.review_count === "number" ? r.review_count : 0,
    status: toStatus(r.is_open),
  }));

  return {
    items,
    summary: {
      total,
      averageRating:
        summaryRow && typeof summaryRow.avg === "number"
          ? Number(summaryRow.avg.toFixed(2))
          : null,
      openCount,
      openRatio: known > 0 ? openCount / known : 0,
    },
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    sort: query.sort,
    direction: query.direction,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Filter options sourced entirely from MongoDB — we never download all docs to
 * build dropdowns. States use distinct() (only 27 values). Cities and
 * categories are bounded, frequency-ranked lists from aggregation.
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  const db = await getDb();
  const coll = db.collection(COLLECTION);

  const statesPromise = coll.distinct("state", {
    state: { $type: "string", $ne: "" },
  }) as Promise<string[]>;

  const citiesPromise = coll
    .aggregate<{ _id: { city: string; state: string }; count: number }>(
      [
        { $match: { city: { $type: "string", $ne: "" } } },
        {
          $group: {
            _id: { city: "$city", state: "$state" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, "_id.city": 1 } },
        { $limit: 300 },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  const categoriesPromise = coll
    .aggregate<{ _id: string; count: number }>(
      [
        { $match: { categories: { $type: "string", $ne: "" } } },
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
        { $unwind: "$cats" },
        { $match: { cats: { $ne: "" } } },
        { $group: { _id: "$cats", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 150 },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  const [states, cities, categories] = await Promise.all([
    statesPromise,
    citiesPromise,
    categoriesPromise,
  ]);

  return {
    states: states.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    cities: cities.map((c) => ({
      city: c._id.city,
      state: c._id.state ?? "",
      count: c.count,
    })),
    categories: categories.map((c) => c._id),
    generatedAt: new Date().toISOString(),
  };
}

interface RawDetail {
  business_id: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  stars?: number;
  review_count?: number;
  is_open?: number;
  categories?: string;
  attributes?: Record<string, unknown> | null;
  hours?: Record<string, unknown> | null;
}

/** Fetch a single business by its natural key. Returns null when not found. */
export async function getBusinessDetail(
  businessId: string,
): Promise<BusinessDetail | null> {
  const db = await getDb();
  const coll = db.collection(COLLECTION);

  const doc = await coll.findOne<RawDetail>(
    { business_id: businessId },
    {
      projection: {
        _id: 0,
        business_id: 1,
        name: 1,
        address: 1,
        city: 1,
        state: 1,
        postal_code: 1,
        latitude: 1,
        longitude: 1,
        stars: 1,
        review_count: 1,
        is_open: 1,
        categories: 1,
        attributes: 1,
        hours: 1,
        // NOTE: review text is deliberately NOT projected — reviews are a
        // separate feature and are never exposed here.
      },
    },
  );

  if (!doc) return null;

  // Normalize attributes: only keep entries with a meaningful value.
  const attributes =
    doc.attributes && typeof doc.attributes === "object"
      ? Object.entries(doc.attributes)
          .map(([key, raw]) => {
            const value = normalizeAttributeValue(raw);
            return value
              ? { key, label: prettifyAttributeKey(key), value }
              : null;
          })
          .filter((a): a is NonNullable<typeof a> => a !== null)
          .sort((a, b) => a.label.localeCompare(b.label))
      : [];

  // Normalize hours into weekday order, keeping only days that are present.
  const hoursObj =
    doc.hours && typeof doc.hours === "object"
      ? (doc.hours as Record<string, unknown>)
      : {};
  const hours = DAY_ORDER.filter((d) => typeof hoursObj[d] === "string").map(
    (d) => ({ day: d, hours: formatHours(hoursObj[d] as string) }),
  );

  return {
    businessId: doc.business_id,
    name: doc.name ?? "(unnamed business)",
    address: doc.address?.trim() || null,
    city: doc.city?.trim() || null,
    state: doc.state?.trim() || null,
    postalCode: doc.postal_code?.trim() || null,
    stars: typeof doc.stars === "number" ? doc.stars : null,
    reviewCount: typeof doc.review_count === "number" ? doc.review_count : 0,
    categories: splitCategories(doc.categories),
    status: toStatus(doc.is_open),
    attributes,
    hours,
    latitude: typeof doc.latitude === "number" ? doc.latitude : null,
    longitude: typeof doc.longitude === "number" ? doc.longitude : null,
  };
}

/** Turn "6:0-21:0" into a readable "6:00 - 21:00". Leaves odd values as-is. */
function formatHours(raw: string): string {
  const m = raw.match(/^(\d{1,2}):(\d{1,2})-(\d{1,2}):(\d{1,2})$/);
  if (!m) return raw;
  const pad = (s: string) => s.padStart(2, "0");
  return `${m[1]}:${pad(m[2]!)} - ${m[3]}:${pad(m[4]!)}`;
}
