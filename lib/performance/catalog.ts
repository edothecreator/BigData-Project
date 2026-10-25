/**
 * Client-safe single source of truth for the Query Performance Lab:
 *  - the scenario allowlist (ids + display metadata + which params each takes)
 *  - the index allowlist the lab is permitted to ensure (create-if-missing)
 *
 * This module holds NO query-building logic and no DB access, so the browser can
 * import it to render the picker. The server builds every query itself in
 * scenarios.ts, keyed by these ids, and re-validates every request with Zod.
 */

export const SCENARIO_IDS = [
  "state-equality",
  "state-city",
  "sort-stars",
  "sort-reviews",
  "name-regex",
  "count-filter",
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type ScenarioParamKey = "state" | "city" | "search";

export interface ScenarioInfo {
  id: ScenarioId;
  label: string;
  description: string;
  /** Which bounded params this scenario reads; drives the picker inputs. */
  params: ScenarioParamKey[];
  /** The index that *should* serve it (teaching context), or null. */
  expectedIndex: string | null;
}

/** Display order of the picker. */
export const SCENARIO_CATALOG: ScenarioInfo[] = [
  {
    id: "state-city",
    label: "Filter by state + city",
    description:
      "Equality on both keys of the compound (state, city) index — the ideal indexed lookup.",
    params: ["state", "city"],
    expectedIndex: "state_1_city_1",
  },
  {
    id: "state-equality",
    label: "Filter by state",
    description:
      "Equality match on a single state, served by the leading key (prefix) of the compound index.",
    params: ["state"],
    expectedIndex: "state_1_city_1",
  },
  {
    id: "sort-stars",
    label: "Sort by rating (stars)",
    description:
      "Top 25 by stars. The (stars, business_id) index already holds that order, so MongoDB walks it and stops after 25 — no scan, no in-memory sort.",
    params: [],
    expectedIndex: "stars_-1_business_id_1",
  },
  {
    id: "sort-reviews",
    label: "Sort by review count",
    description:
      "Top 25 by review_count, served by the (review_count, business_id) index in order.",
    params: [],
    expectedIndex: "review_count_-1_business_id_1",
  },
  {
    id: "name-regex",
    label: "Name substring (regex)",
    description:
      "Case-insensitive, unanchored regex on name. A btree index can't seek to a substring, so this is always a collection scan — the counter-example.",
    params: ["search"],
    expectedIndex: null,
  },
  {
    id: "count-filter",
    label: "Count by filter",
    description:
      "Exact countDocuments({ state }) — answered by counting index keys (COUNT_SCAN) — compared with the O(1) estimatedDocumentCount metadata read.",
    params: ["state"],
    expectedIndex: "state_1_city_1",
  },
];

export function getScenarioInfo(id: ScenarioId): ScenarioInfo {
  // SCENARIO_CATALOG covers every id; the non-null assertion is safe.
  return SCENARIO_CATALOG.find((s) => s.id === id)!;
}

/**
 * The ONLY indexes the lab may create. Hardcoded, non-unique, on known fields,
 * and identical to scripts/ensure-indexes.js for `businesses`. Creation is
 * idempotent (create-if-missing). The lab never drops or modifies indexes.
 */
export const MANAGED_INDEX_IDS = [
  "state_1_city_1",
  "stars_-1_business_id_1",
  "review_count_-1_business_id_1",
] as const;

export type ManagedIndexId = (typeof MANAGED_INDEX_IDS)[number];

export interface ManagedIndexSpec {
  id: ManagedIndexId;
  /** Ordered key spec. */
  keys: { field: string; direction: 1 | -1 }[];
  purpose: string;
}

export const MANAGED_INDEXES: Record<ManagedIndexId, ManagedIndexSpec> = {
  state_1_city_1: {
    id: "state_1_city_1",
    keys: [
      { field: "state", direction: 1 },
      { field: "city", direction: 1 },
    ],
    purpose: "Serves state and state + city filters, and state counts.",
  },
  "stars_-1_business_id_1": {
    id: "stars_-1_business_id_1",
    keys: [
      { field: "stars", direction: -1 },
      { field: "business_id", direction: 1 },
    ],
    purpose: "Serves the sort-by-rating order without an in-memory sort.",
  },
  "review_count_-1_business_id_1": {
    id: "review_count_-1_business_id_1",
    keys: [
      { field: "review_count", direction: -1 },
      { field: "business_id", direction: 1 },
    ],
    purpose: "Serves the sort-by-review-count order without an in-memory sort.",
  },
};
