/**
 * Browser-facing types for the Business Explorer.
 *
 * As with the dashboard, nothing here is a raw MongoDB document: every shape is
 * normalized to plain JSON. Internal `_id` is never included — `business_id`
 * (the dataset's natural key) is used for identity and detail lookups.
 */

/** Fields of `is_open` normalized to a readable status. */
export type BusinessStatus = "open" | "closed" | "unknown";

/** A single row in the results table (projected, minimal fields). */
export interface BusinessListItem {
  businessId: string;
  name: string;
  city: string;
  state: string;
  /** Trimmed, de-duplicated category names. */
  categories: string[];
  stars: number | null;
  reviewCount: number;
  status: BusinessStatus;
}

/** Summary metrics over the *entire* current filter (not just one page). */
export interface BusinessSummary {
  /** Total matching businesses for the active filters. */
  total: number;
  /** Average stars across all matches, or null when empty. */
  averageRating: number | null;
  /** Count of matches with is_open === 1. */
  openCount: number;
  /** Fraction open among matches with a known status, 0..1. */
  openRatio: number;
}

/** Allowed sort fields (allowlist — mirrored by the API validator). */
export type BusinessSortField =
  | "name"
  | "stars"
  | "review_count"
  | "city";

export type SortDirection = "asc" | "desc";

/** The full result payload for a list request. */
export interface BusinessListResult {
  items: BusinessListItem[];
  summary: BusinessSummary;
  page: number;
  pageSize: number;
  /** Total matching documents (exact count over the filter). */
  total: number;
  totalPages: number;
  sort: BusinessSortField;
  direction: SortDirection;
  generatedAt: string;
}

/** Options for the filter controls, sourced from the database. */
export interface FilterOptions {
  /** Distinct states, sorted. */
  states: string[];
  /**
   * Top cities with their state and business count. Bounded list — not every
   * one of the ~1,400 cities. The city control stays searchable client-side
   * over this bounded set, and free-text city input is also accepted.
   */
  cities: { city: string; state: string; count: number }[];
  /** Top category names, bounded and sorted by frequency. */
  categories: string[];
  generatedAt: string;
}

/** A normalized attribute key/value pair for the detail view. */
export interface BusinessAttribute {
  key: string;
  /** Human-readable label derived from the key. */
  label: string;
  /** Normalized display value. */
  value: string;
}

/** One day's opening hours. */
export interface BusinessHours {
  day: string;
  hours: string;
}

/** The full detail payload for a single business. */
export interface BusinessDetail {
  businessId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  stars: number | null;
  reviewCount: number;
  categories: string[];
  status: BusinessStatus;
  attributes: BusinessAttribute[];
  hours: BusinessHours[];
  /** Present only when the dataset has coordinates. Metadata only. */
  latitude: number | null;
  longitude: number | null;
}

/** Consistent error envelope (mirrors the dashboard's). */
export interface BusinessApiError {
  error: true;
  code: "VALIDATION_FAILED" | "DB_UNREACHABLE" | "QUERY_FAILED" | "NOT_FOUND";
  message: string;
  /** Field-level issues for validation failures. */
  issues?: { path: string; message: string }[];
}
