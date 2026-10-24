import "server-only";

import type { Document, Sort } from "mongodb";

/**
 * Curated, ALLOWLISTED query scenarios for the Query Performance Lab.
 *
 * SAFETY: the client may only pick a scenario by id plus a few bounded params.
 * It can never send a raw filter, pipeline, field name, or MongoDB operator.
 * Each scenario builds its own filter/sort/limit here, server-side, from those
 * validated params. This is the single source of truth for what the lab can run.
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

/** Parameters a scenario may read (all validated + bounded by the schema). */
export interface ScenarioParams {
  state?: string;
  city?: string;
  search?: string;
}

export type ScenarioKind = "find" | "count";

export interface ScenarioPlan {
  kind: ScenarioKind;
  filter: Document;
  sort?: Sort;
  limit?: number;
}

export interface ScenarioDef {
  id: ScenarioId;
  label: string;
  description: string;
  /** Which bounded params this scenario uses, for the UI to render inputs. */
  params: Array<"state" | "city" | "search">;
  /** The index that *should* serve it, for teaching context. */
  expectedIndex: string | null;
  build: (p: ScenarioParams) => ScenarioPlan;
}

/** Escape regex metacharacters so user input is matched literally. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEFAULT_LIMIT = 25;

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  "state-equality": {
    id: "state-equality",
    label: "Filter by state",
    description:
      "Equality match on a single state. Served by the compound (state, city) index as a prefix.",
    params: ["state"],
    expectedIndex: "state_1_city_1",
    build: (p) => ({
      kind: "find",
      filter: { state: p.state ?? "PA" },
      limit: DEFAULT_LIMIT,
    }),
  },
  "state-city": {
    id: "state-city",
    label: "Filter by state + city",
    description:
      "Equality on both keys of the compound index — the ideal indexed lookup.",
    params: ["state", "city"],
    expectedIndex: "state_1_city_1",
    build: (p) => ({
      kind: "find",
      filter: {
        state: p.state ?? "PA",
        city: p.city ?? "Philadelphia",
      },
      limit: DEFAULT_LIMIT,
    }),
  },
  "sort-stars": {
    id: "sort-stars",
    label: "Sort by rating",
    description:
      "Top businesses by stars. The (stars, business_id) index lets MongoDB walk the order without scanning or sorting in memory.",
    params: [],
    expectedIndex: "stars_-1_business_id_1",
    build: () => ({
      kind: "find",
      filter: {},
      sort: { stars: -1, business_id: 1 },
      limit: DEFAULT_LIMIT,
    }),
  },
  "sort-reviews": {
    id: "sort-reviews",
    label: "Sort by review count",
    description:
      "Top businesses by review_count, served by the (review_count, business_id) index.",
    params: [],
    expectedIndex: "review_count_-1_business_id_1",
    build: () => ({
      kind: "find",
      filter: {},
      sort: { review_count: -1, business_id: 1 },
      limit: DEFAULT_LIMIT,
    }),
  },
  "name-regex": {
    id: "name-regex",
    label: "Search name (regex)",
    description:
      "Case-insensitive substring match on name. A btree index can't serve an unanchored regex, so this falls back to a collection scan — the teaching counter-example.",
    params: ["search"],
    expectedIndex: null,
    build: (p) => ({
      kind: "find",
      filter: {
        name: { $regex: escapeRegex(p.search ?? "coffee"), $options: "i" },
      },
      limit: DEFAULT_LIMIT,
    }),
  },
  "count-filter": {
    id: "count-filter",
    label: "Count by state",
    description:
      "countDocuments over a state filter. Compared with the O(1) metadata estimate in the results panel.",
    params: ["state"],
    expectedIndex: "state_1_city_1",
    build: (p) => ({
      kind: "count",
      filter: { state: p.state ?? "PA" },
    }),
  },
};

export function getScenario(id: ScenarioId): ScenarioDef {
  return SCENARIOS[id];
}
