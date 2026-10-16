import "server-only";

import type { Db, Document } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { Insight } from "@/lib/dashboard/types";
import type { InsightsQuery } from "@/lib/insights/schema";
import type { CategoryMarket, GeographicMarket, InsightsData, MarketMetrics } from "@/lib/insights/types";
import { formatFull } from "@/lib/utils";

const OPTIONS = { allowDiskUse: true, maxTimeMS: 20_000 };

// Retain only fields needed for summarized analytics; review text is never read.
const categoryStages: Document[] = [
  { $match: { categories: { $type: "string", $ne: "" } } },
  { $project: {
    stars: 1, is_open: 1, review_count: 1, city: 1, state: 1,
    cats: { $map: {
      input: { $split: ["$categories", ","] }, as: "c",
      in: { $trim: { input: "$$c" } },
    } },
  } },
  // Duplicate fragments must not count the same business twice in one category.
  { $set: { cats: { $setUnion: ["$cats", []] } } },
  { $unwind: "$cats" },
  { $match: { cats: { $ne: "" } } },
];

const metrics = {
  count: { $sum: 1 },
  averageRating: { $avg: { $cond: [
    { $and: [{ $isNumber: "$stars" }, { $gte: ["$stars", 1] }, { $lte: ["$stars", 5] }] },
    "$stars", null,
  ] } },
  open: { $sum: { $cond: [{ $eq: ["$is_open", 1] }, 1, 0] } },
  known: { $sum: { $cond: [{ $in: ["$is_open", [0, 1]] }, 1, 0] } },
  averageReviews: { $avg: { $cond: [
    { $and: [{ $isNumber: "$review_count" }, { $gte: ["$review_count", 0] }] },
    "$review_count", null,
  ] } },
};

interface RawMetrics {
  count: number;
  averageRating: number | null;
  open: number;
  known: number;
  averageReviews: number | null;
}
interface RawCategory extends RawMetrics { _id: string }
interface RawGeography extends RawMetrics { _id: { state: string; city?: string } }

function shapeMetrics(row: RawMetrics): MarketMetrics {
  return {
    count: row.count,
    averageRating: row.averageRating === null ? null : Number(row.averageRating.toFixed(4)),
    openRatio: row.known > 0 ? row.open / row.known : null,
    averageReviews: row.averageReviews === null ? null : Number(row.averageReviews.toFixed(2)),
  };
}

async function getCategories(db: Db) {
  // One normalization/group pass feeds three bounded results. Engagement is
  // ranked across ALL categories, rather than just the twelve largest ones.
  const [result] = await db.collection("businesses").aggregate<{
    landscape: RawCategory[]; engagement: RawCategory[]; options: { _id: string }[];
  }>([
    ...categoryStages,
    { $group: { _id: "$cats", ...metrics } },
    { $facet: {
      landscape: [{ $sort: { count: -1, _id: 1 } }, { $limit: 12 }],
      engagement: [
        // Avoid ranking tiny categories on one unusually popular business.
        { $match: { count: { $gte: 20 }, averageReviews: { $ne: null } } },
        { $sort: { averageReviews: -1, _id: 1 } }, { $limit: 12 },
      ],
      options: [
        { $match: { _id: { $regex: "^.{1,120}$" } } },
        { $sort: { count: -1, _id: 1 } }, { $limit: 100 }, { $project: { _id: 1 } },
      ],
    } },
    { $limit: 1 },
  ], OPTIONS).toArray();
  const shape = (row: RawCategory): CategoryMarket => ({ category: row._id, ...shapeMetrics(row) });
  return {
    categories: (result?.landscape ?? []).map(shape),
    engagement: (result?.engagement ?? []).map(shape),
    categoryOptions: (result?.options ?? []).map((row) => row._id),
  };
}

async function getGeography(db: Db, state?: string, category?: string, byState = false): Promise<GeographicMarket[]> {
  // Cross-dimensional pipeline: match state early, normalize categories, match
  // an EXACT trimmed category, then group by city AND state. No substring regex
  // or client-provided operators enter the pipeline. Only twelve cities return.
  const pipeline: Document[] = [
    { $match: {
      state: state ?? { $type: "string", $regex: "^[A-Z]{1,8}$" },
      ...(!byState ? { city: { $type: "string", $ne: "" } } : {}),
    } },
    ...(category ? [...categoryStages, { $match: { cats: category } }] : []),
    { $group: {
      _id: byState ? { state: "$state" } : { city: "$city", state: "$state" },
      ...metrics,
    } },
    { $sort: { count: -1, "_id.state": 1, "_id.city": 1 } },
    { $limit: byState ? 50 : 12 },
  ];
  const rows = await db.collection("businesses").aggregate<RawGeography>(pipeline, OPTIONS).toArray();
  return rows.map((row) => ({
    state: row._id.state,
    city: row._id.city ?? null,
    label: row._id.city ? `${row._id.city}, ${row._id.state}` : row._id.state,
    ...shapeMetrics(row),
  }));
}

function buildInsights(categories: CategoryMarket[], states: GeographicMarket[], markets: GeographicMarket[], category: string | null): Insight[] {
  const observations: Insight[] = [];
  const highestRated = categories.filter((row) => row.averageRating !== null)
    .sort((a, b) => b.averageRating! - a.averageRating! || a.category.localeCompare(b.category))[0];
  if (highestRated) observations.push({
    id: "highest-rated", label: "Highest rated leading category", value: highestRated.category,
    detail: `${highestRated.averageRating!.toFixed(2)} stars among the top 12 categories by business count.`,
  });
  if (states[0]) observations.push({
    id: "largest-state", label: "Most businesses by state", value: states[0].state,
    detail: `${formatFull(states[0].count)} businesses in this dataset; not a population-adjusted market share.`,
  });
  if (markets[0] && category) observations.push({
    id: "category-market", label: "Leading city for selected category", value: markets[0].label,
    detail: `${formatFull(markets[0].count)} ${category} businesses in the selected geographic scope.`,
  });
  return observations;
}

export async function getInsightsData(query: InsightsQuery): Promise<InsightsData> {
  const db = await getDb();
  const cursor = db.listCollections({ name: "businesses" }, { nameOnly: true });
  const businessesAvailable = await cursor.hasNext();
  await cursor.close();
  if (!businessesAvailable) return {
    businessesAvailable: false, categories: [], engagement: [], categoryOptions: [],
    states: [], cities: [], categoryMarkets: [], selectedCategory: query.category ?? null,
    selectedState: query.state ?? null, insights: [], generatedAt: new Date().toISOString(),
  };

  const [categoryData, states, cities, explicitMarkets] = await Promise.all([
    getCategories(db), getGeography(db, undefined, undefined, true), getGeography(db, query.state),
    query.category ? getGeography(db, query.state, query.category) : Promise.resolve(null),
  ]);
  const selectedCategory = query.category ?? categoryData.categoryOptions[0] ?? null;
  // A default category depends on the category result. Explicit selections can
  // include categories beyond the bounded dropdown and still use exact matching.
  const categoryMarkets = explicitMarkets ?? (selectedCategory ? await getGeography(db, query.state, selectedCategory) : []);
  return {
    businessesAvailable, ...categoryData, states, cities, categoryMarkets,
    selectedCategory, selectedState: query.state ?? null,
    insights: buildInsights(categoryData.categories, states, categoryMarkets, selectedCategory),
    generatedAt: new Date().toISOString(),
  };
}
