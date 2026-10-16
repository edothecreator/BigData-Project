/**
 * Browser-facing types for the Recommendations feature.
 *
 * Two recommendation strategies are exposed, both item-to-item (never
 * personalized per end-user, so no user identity is ever involved or exposed):
 *
 *   - "content"       : content-based — similar businesses by shared categories,
 *                        location, and rating. Live MongoDB aggregation.
 *   - "collaborative" : "people who reviewed this also reviewed..." — derived
 *                        from co-reviewing patterns in the reviews collection.
 *                        Index-backed; no review text or user identity returned.
 */

export type RecommendationStrategy = "content" | "collaborative";

/** A compact business card used in recommendation lists. */
export interface RecommendedBusiness {
  businessId: string;
  name: string;
  city: string;
  state: string;
  categories: string[];
  stars: number | null;
  reviewCount: number;
  status: "open" | "closed" | "unknown";
  /**
   * Why this item was recommended:
   *   - content       -> number of categories shared with the seed
   *   - collaborative -> number of common reviewers with the seed
   */
  score: number;
  /** Human-readable reason, e.g. "5 shared categories" or "19 common reviewers". */
  reason: string;
}

/** The seed business the recommendations are relative to. */
export interface RecommendationSeed {
  businessId: string;
  name: string;
  city: string;
  state: string;
  categories: string[];
  stars: number | null;
}

/** Full payload returned by the recommendations endpoint. */
export interface RecommendationResult {
  seed: RecommendationSeed;
  strategy: RecommendationStrategy;
  /** The strategy actually used (may differ from requested on fallback). */
  effectiveStrategy: RecommendationStrategy;
  /** Set when a requested strategy fell back (e.g. collaborative -> content). */
  fallbackReason: string | null;
  items: RecommendedBusiness[];
  generatedAt: string;
}

/** Lightweight option for the seed picker's search. */
export interface SeedOption {
  businessId: string;
  name: string;
  city: string;
  state: string;
  stars: number | null;
  reviewCount: number;
}

export interface RecommendationApiError {
  error: true;
  code: "VALIDATION_FAILED" | "DB_UNREACHABLE" | "QUERY_FAILED" | "NOT_FOUND";
  message: string;
  issues?: { path: string; message: string }[];
}
