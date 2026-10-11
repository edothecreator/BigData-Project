/**
 * Shared types for the dashboard data contract.
 *
 * These shapes are produced by the query layer and consumed by the API route
 * and the client components, so they define the full browser-facing payload.
 * No raw MongoDB documents or BSON values ever appear here — everything is
 * normalized to plain numbers, strings, and booleans.
 */

/** The five dataset collections ReviewScope expects. */
export type CollectionKey =
  | "businesses"
  | "reviews"
  | "users"
  | "tips"
  | "checkins";

/** Availability + count for a single collection. */
export interface CollectionStat {
  key: CollectionKey;
  label: string;
  /** Whether the collection exists in the database. */
  available: boolean;
  /**
   * Estimated document count. Null when the collection is not imported.
   * These are metadata estimates (estimatedDocumentCount), not exact
   * transactional counts — appropriate for a large, static imported dataset.
   */
  count: number | null;
}

/** One bar in the rating distribution chart. */
export interface RatingBucket {
  /** Rating value, e.g. 1, 1.5, 2, ... 5. */
  rating: number;
  /** Formatted label, e.g. "1.0", "4.5". */
  label: string;
  count: number;
}

/** One bar in the top categories chart. */
export interface CategoryCount {
  category: string;
  count: number;
}

/** Open vs closed breakdown. */
export interface AvailabilityBreakdown {
  open: number;
  closed: number;
  /** Documents whose is_open was null/invalid; excluded from the ratio. */
  unknown: number;
  /** Fraction of open among known (open + closed) businesses, 0..1. */
  openRatio: number;
}

/** One bar in the top cities chart. */
export interface CityCount {
  city: string;
  state: string;
  /** Combined display label, e.g. "Philadelphia, PA". */
  label: string;
  count: number;
}

/** A single derived observation shown in Quick Insights. */
export interface Insight {
  id: string;
  label: string;
  value: string;
  detail: string;
}

/** The complete dashboard payload returned by the API. */
export interface DashboardData {
  collections: CollectionStat[];
  /** Average of businesses.stars, or null if unavailable. */
  averageRating: number | null;
  ratingDistribution: RatingBucket[];
  topCategories: CategoryCount[];
  availability: AvailabilityBreakdown;
  topCities: CityCount[];
  insights: Insight[];
  /** ISO timestamp of when this payload was produced on the server. */
  generatedAt: string;
}

/** Error envelope returned when the database cannot be reached. */
export interface DashboardError {
  error: true;
  code: "DB_UNREACHABLE" | "QUERY_FAILED" | "CONFIG_INVALID";
  message: string;
}
