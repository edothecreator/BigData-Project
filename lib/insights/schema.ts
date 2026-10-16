import { z } from "zod";

// Only scalar, bounded filters are accepted. Unknown keys/operators are rejected.
export const insightsQuerySchema = z.object({
  category: z.string().trim().min(1).max(120).optional(),
  state: z.string().trim().min(1).max(8).regex(/^[A-Z]+$/).optional(),
}).strict();

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
