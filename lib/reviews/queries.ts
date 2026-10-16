import "server-only";

import { getDb } from "@/lib/mongodb";
import type { ReviewAnalytics } from "@/lib/reviews/types";

const options = { allowDiskUse: true, maxTimeMS: 180_000 };

async function queryAnalytics(): Promise<ReviewAnalytics> {
  const db = await getDb();
  const available = (await db.listCollections({ name: "reviews" }, { nameOnly: true }).toArray()).length > 0;
  if (!available) {
    return {
      available: false, totalReviews: null, averageReviewRating: null,
      usefulVotes: 0, dateSpan: null, ratingDistribution: [],
      reviewsOverTime: [], topBusinesses: [], generatedAt: new Date().toISOString(),
    };
  }
  const reviews = db.collection("reviews");
  // Full-collection groups are intentional: the headline Volume demonstration
  // scans ~7M reviews in MongoDB, returning only 5 ratings, <=10000 years and
  // 15 business IDs. No raw review text or user IDs enter app memory.
  // Separate pipelines avoid buffering millions of documents inside $facet.
  const [totalReviews, summary, ratings, years, top] = await Promise.all([
    reviews.estimatedDocumentCount(),
    reviews.aggregate<{ average: number | null; useful: number }>([
      { $group: { _id: null, average: { $avg: "$stars" }, useful: { $sum: "$useful" } } },
      { $project: { _id: 0, average: 1, useful: 1 } },
      { $limit: 1 },
    ], options).toArray(),
    reviews.aggregate<{ stars: number; count: number }>([
      { $match: { stars: { $in: [1, 2, 3, 4, 5] } } },
      { $group: { _id: "$stars", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $limit: 5 },
      { $project: { _id: 0, stars: "$_id", count: 1 } },
    ], options).toArray(),
    reviews.aggregate<{ year: string; count: number }>([
      // Validate the string prefix before $substrBytes; odd/missing rows are
      // excluded rather than causing date parsing failures or fake year bins.
      { $match: { date: { $type: "string", $regex: "^[0-9]{4}-[0-9]{2}-[0-9]{2} " } } },
      { $group: { _id: { $substrBytes: ["$date", 0, 4] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $limit: 10000 },
      { $project: { _id: 0, year: "$_id", count: 1 } },
    ], options).toArray(),
    reviews.aggregate<{ businessId: string; count: number }>([
      { $match: { business_id: { $type: "string", $ne: "" } } },
      { $group: { _id: "$business_id", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }, { $limit: 15 },
      { $project: { _id: 0, businessId: "$_id", count: 1 } },
    ], options).toArray(),
  ]);
  // One bounded query for labels AFTER limiting, never a browser-side N+1 join.
  const labels = top.length ? await db.collection("businesses")
    .find<{ business_id: string; name?: string; city?: string; state?: string }>(
      { business_id: { $in: top.map(row => row.businessId) } },
      { projection: { _id: 0, business_id: 1, name: 1, city: 1, state: 1 }, maxTimeMS: 30_000 },
    ).limit(15).toArray() : [];
  const byId = new Map(labels.map(row => [row.business_id, row]));
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  return {
    available, totalReviews, averageReviewRating: summary[0]?.average ?? null,
    usefulVotes: summary[0]?.useful ?? 0,
    dateSpan: firstYear && lastYear ? { earliest: firstYear.year, latest: lastYear.year } : null,
    ratingDistribution: [1, 2, 3, 4, 5].map(stars => ({ stars, count: ratings.find(row => row.stars === stars)?.count ?? 0 })),
    reviewsOverTime: years,
    topBusinesses: top.map(row => ({
      businessId: row.businessId, name: byId.get(row.businessId)?.name ?? "Business metadata unavailable",
      city: byId.get(row.businessId)?.city ?? "", state: byId.get(row.businessId)?.state ?? "", reviewCount: row.count,
    })),
    generatedAt: new Date().toISOString(),
  };
}

// Coalesce concurrent loads/Strict Mode mounts, without caching completed data.
// Refresh always starts a new computation once the current request completes.
let inFlight: Promise<ReviewAnalytics> | null = null;
export function getReviewAnalytics(): Promise<ReviewAnalytics> {
  if (!inFlight) inFlight = queryAnalytics().finally(() => { inFlight = null; });
  return inFlight;
}
