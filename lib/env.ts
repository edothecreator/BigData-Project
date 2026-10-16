import { z } from "zod";

/**
 * Server-only environment configuration, validated once at module load.
 *
 * These values must never be exposed to the browser, so they are intentionally
 * NOT prefixed with NEXT_PUBLIC_. Importing this module from a client component
 * would raise a build error, which is the desired guard.
 */
const envSchema = z.object({
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a valid MongoDB connection string",
    ),
  MONGODB_DB: z.string().min(1, "MONGODB_DB is required"),
});

const parsed = envSchema.safeParse({
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment configuration. Check the container environment or your .env.local file:\n${issues}`,
  );
}

export const env = parsed.data;
