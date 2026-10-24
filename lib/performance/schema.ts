import { z } from "zod";

import { SCENARIO_IDS } from "@/lib/performance/scenarios";

/**
 * Validates the Query Performance Lab request. The client sends a scenario id
 * from the allowlist plus a few bounded, scalar params — never raw filters,
 * pipelines, field names, or operators. Unknown keys are rejected (.strict()).
 */
export const performanceQuerySchema = z
  .object({
    scenario: z.enum(SCENARIO_IDS),
    state: z
      .string()
      .trim()
      .max(8)
      .regex(/^[A-Za-z]+$/, "State must be letters only.")
      .optional()
      .transform((v) => (v ? v.toUpperCase() : undefined)),
    city: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    search: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
  })
  .strict();

export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;
