import { z } from "zod";

import { MANAGED_INDEX_IDS, SCENARIO_IDS } from "@/lib/performance/catalog";

/**
 * Validates Query Performance Lab requests. The client sends a scenario id from
 * the allowlist plus a few bounded, scalar params — never raw filters,
 * pipelines, field names, or operators. Unknown keys are rejected (.strict()).
 */

export const MAX_STATE_LENGTH = 3;
export const MAX_CITY_LENGTH = 80;
export const MAX_SEARCH_LENGTH = 60;

/** Trim, cap, and treat empty as undefined (mirrors lib/businesses/schema.ts). */
const trimmedOptional = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

export const performanceQuerySchema = z
  .object({
    scenario: z.enum(SCENARIO_IDS),
    // Yelp state codes are 2–3 letters (e.g. "PA", "XMS").
    state: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,3}$/, "State must be a 2–3 letter code.")
      .optional()
      .transform((v) => (v ? v.toUpperCase() : undefined)),
    city: trimmedOptional(MAX_CITY_LENGTH, "City"),
    search: trimmedOptional(MAX_SEARCH_LENGTH, "Search"),
  })
  .strict();

export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;

/** Body of POST /api/performance/indexes: one allowlisted index id, nothing else. */
export const ensureIndexSchema = z
  .object({
    index: z.enum(MANAGED_INDEX_IDS),
  })
  .strict();

export type EnsureIndexRequest = z.infer<typeof ensureIndexSchema>;
