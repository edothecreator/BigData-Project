import { z } from "zod";

/** Allowed recommendation strategies (allowlist). */
export const STRATEGIES = ["content", "collaborative"] as const;

/** Business id format: Yelp's URL-safe token. Shared with the detail route. */
export const businessIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid business id.");

/** Query params for GET /api/recommendations. */
export const recommendationQuerySchema = z.object({
  businessId: businessIdSchema,
  strategy: z.enum(STRATEGIES).default("content"),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;

/** Query params for the seed search endpoint. */
export const seedSearchSchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type SeedSearchQuery = z.infer<typeof seedSearchSchema>;
