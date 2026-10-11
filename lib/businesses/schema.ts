import { z } from "zod";

/**
 * Validated query parameters for the Business Explorer list endpoint.
 *
 * Everything the client can influence is constrained here: lengths are capped,
 * page/pageSize are bounded, sort fields and direction come from explicit
 * allowlists, and the rating/status are restricted to supported values. The
 * client never sends raw MongoDB operators or pipeline fragments — only these
 * scalar parameters.
 */

export const PAGE_SIZES = [10, 25, 50] as const;
export const SORT_FIELDS = ["name", "stars", "review_count", "city"] as const;
export const MIN_RATINGS = [0, 2, 3, 4, 4.5] as const;
export const STATUS_VALUES = ["any", "open", "closed"] as const;

export const MAX_SEARCH_LENGTH = 100;
const MAX_FILTER_VALUE_LENGTH = 120;

/** Coerce an optional string, trim it, and treat empty as undefined. */
const trimmedOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

export const listQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(MAX_SEARCH_LENGTH, `Search must be ${MAX_SEARCH_LENGTH} characters or fewer.`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),

  city: trimmedOptional(MAX_FILTER_VALUE_LENGTH),
  state: trimmedOptional(MAX_FILTER_VALUE_LENGTH),
  category: trimmedOptional(MAX_FILTER_VALUE_LENGTH),

  minRating: z.coerce
    .number()
    .refine(
      (v): v is (typeof MIN_RATINGS)[number] =>
        (MIN_RATINGS as readonly number[]).includes(v),
      "Unsupported minimum rating.",
    )
    .default(0),

  status: z.enum(STATUS_VALUES).default("any"),

  page: z.coerce.number().int().min(1).max(100_000).default(1),

  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (v): v is (typeof PAGE_SIZES)[number] =>
        (PAGE_SIZES as readonly number[]).includes(v),
      "Unsupported page size.",
    )
    .default(25),

  sort: z.enum(SORT_FIELDS).default("review_count"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

/** Validation for the detail endpoint's business id (dataset natural key). */
export const businessIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  // Yelp business_id values are URL-safe base64-ish tokens.
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid business id.");
