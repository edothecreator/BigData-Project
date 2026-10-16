import { z } from "zod";

/** Allowed marker caps for the map (keeps payloads and render cost bounded). */
export const MAP_LIMITS = [200, 500, 1000] as const;

export const STATUS_VALUES = ["any", "open", "closed"] as const;

export const mapQuerySchema = z.object({
  state: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  status: z.enum(STATUS_VALUES).default("any"),
  minRating: z.coerce
    .number()
    .refine((v) => [0, 3, 4, 4.5].includes(v), "Unsupported minimum rating.")
    .default(0),
  limit: z.coerce
    .number()
    .int()
    .refine(
      (v): v is (typeof MAP_LIMITS)[number] =>
        (MAP_LIMITS as readonly number[]).includes(v),
      "Unsupported limit.",
    )
    .default(500),
});

export type MapQuery = z.infer<typeof mapQuerySchema>;
