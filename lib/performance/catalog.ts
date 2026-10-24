import type { ScenarioInfo } from "@/lib/performance/types";

/**
 * Client-safe catalog of the lab's scenarios (labels, descriptions, which
 * params each needs). Mirrors the server allowlist in scenarios.ts so the
 * picker can render without a round-trip. The SERVER still re-validates every
 * request against its own allowlist — this is display metadata only.
 */
export const SCENARIO_CATALOG: ScenarioInfo[] = [
  {
    id: "state-city",
    label: "Filter by state + city",
    description:
      "Equality on both keys of the compound index — the ideal indexed lookup.",
    params: ["state", "city"],
    expectedIndex: "state_1_city_1",
  },
  {
    id: "state-equality",
    label: "Filter by state",
    description:
      "Equality match on a single state, served by the compound index prefix.",
    params: ["state"],
    expectedIndex: "state_1_city_1",
  },
  {
    id: "sort-stars",
    label: "Sort by rating",
    description:
      "Top businesses by stars — the index supplies the order, no in-memory sort.",
    params: [],
    expectedIndex: "stars_-1_business_id_1",
  },
  {
    id: "sort-reviews",
    label: "Sort by review count",
    description: "Top businesses by review_count, served by its sorted index.",
    params: [],
    expectedIndex: "review_count_-1_business_id_1",
  },
  {
    id: "name-regex",
    label: "Search name (regex)",
    description:
      "Unanchored case-insensitive regex — can't use a btree index, so it scans. The counter-example.",
    params: ["search"],
    expectedIndex: null,
  },
  {
    id: "count-filter",
    label: "Count by state",
    description:
      "Exact countDocuments vs the O(1) metadata estimate, side by side.",
    params: ["state"],
    expectedIndex: "state_1_city_1",
  },
];
