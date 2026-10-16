import type { ZodError } from "zod";

import type { RecommendationApiError } from "@/lib/recommendations/types";

export function classifyDbError(err: unknown): RecommendationApiError {
  const message = err instanceof Error ? err.message : String(err);
  const isUnreachable =
    /ECONNREFUSED|ServerSelectionTimeout|connect|getaddrinfo|topology/i.test(
      message,
    );
  return isUnreachable
    ? {
        error: true,
        code: "DB_UNREACHABLE",
        message:
          "Could not reach MongoDB. Make sure the local server is running on 127.0.0.1:27017 and the yelp_analytics database exists.",
      }
    : {
        error: true,
        code: "QUERY_FAILED",
        message: `The query failed: ${message}`,
      };
}

export function validationError(err: ZodError): RecommendationApiError {
  return {
    error: true,
    code: "VALIDATION_FAILED",
    message: "One or more parameters are invalid.",
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}

export function statusForError(error: RecommendationApiError): number {
  switch (error.code) {
    case "VALIDATION_FAILED":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "DB_UNREACHABLE":
      return 503;
    default:
      return 500;
  }
}
