import "server-only";

import type { Document, Sort } from "mongodb";

import { escapeRegex } from "@/lib/businesses/queries";
import type { ScenarioId } from "@/lib/performance/catalog";

/**
 * Server-side query builders for the allowlisted scenarios.
 *
 * SAFETY: the client only picks a scenario id (validated against SCENARIO_IDS)
 * plus a few bounded scalar params. It can never send a raw filter, pipeline,
 * field name, or operator. Every filter/sort/limit is constructed here, with
 * user strings used only as equality values or as an ESCAPED regex literal.
 */

/** Parameters a scenario may read (all validated + bounded by the schema). */
export interface ScenarioParams {
  state?: string;
  city?: string;
  search?: string;
}

export type ScenarioPlan =
  | { kind: "find"; filter: Document; sort?: Sort; limit: number }
  | { kind: "count"; filter: Document };

/** Every find scenario returns at most this many documents. */
export const RESULT_LIMIT = 25;

const DEFAULT_STATE = "PA";
const DEFAULT_CITY = "Philadelphia";
const DEFAULT_SEARCH = "coffee";

const BUILDERS: Record<ScenarioId, (p: ScenarioParams) => ScenarioPlan> = {
  "state-equality": (p) => ({
    kind: "find",
    filter: { state: p.state ?? DEFAULT_STATE },
    limit: RESULT_LIMIT,
  }),
  "state-city": (p) => ({
    kind: "find",
    filter: {
      state: p.state ?? DEFAULT_STATE,
      city: p.city ?? DEFAULT_CITY,
    },
    limit: RESULT_LIMIT,
  }),
  "sort-stars": () => ({
    kind: "find",
    filter: {},
    sort: { stars: -1, business_id: 1 },
    limit: RESULT_LIMIT,
  }),
  "sort-reviews": () => ({
    kind: "find",
    filter: {},
    sort: { review_count: -1, business_id: 1 },
    limit: RESULT_LIMIT,
  }),
  "name-regex": (p) => ({
    kind: "find",
    filter: {
      name: { $regex: escapeRegex(p.search ?? DEFAULT_SEARCH), $options: "i" },
    },
    limit: RESULT_LIMIT,
  }),
  "count-filter": (p) => ({
    kind: "count",
    filter: { state: p.state ?? DEFAULT_STATE },
  }),
};

export function buildScenario(
  id: ScenarioId,
  params: ScenarioParams,
): ScenarioPlan {
  return BUILDERS[id](params);
}
