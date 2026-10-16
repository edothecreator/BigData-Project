import { z } from "zod";

// This aggregate endpoint accepts no filters or client-provided pipelines.
export const reviewsQuerySchema = z.object({}).strict();
