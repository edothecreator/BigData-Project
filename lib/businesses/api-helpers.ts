import type { ZodError } from "zod";

import type { BusinessApiError } from "@/lib/businesses/types";

/** Classify a thrown error as an unreachable DB vs a generic query failure. */
export function classifyDbError(err: unknown): BusinessApiError {
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

/** Shape a Zod validation error into the API error envelope. */
export function validationError(err: ZodError): BusinessApiError {
  return {
    error: true,
    code: "VALIDATION_FAILED",
    message: "One or more query parameters are invalid.",
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}

/** HTTP status for an error envelope. */
export function statusForError(error: BusinessApiError): number {
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
