"use client";

import * as React from "react";

import type {
  RecommendationApiError,
  RecommendationResult,
  RecommendationStrategy,
} from "@/lib/recommendations/types";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Fetches recommendations for a seed business + strategy. Guards against
 * out-of-order responses with a request-id ref so a slow earlier request can
 * never overwrite a newer one.
 */
export function useRecommendations(
  businessId: string | null,
  strategy: RecommendationStrategy,
  limit = 6,
) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [data, setData] = React.useState<RecommendationResult | null>(null);
  const [error, setError] = React.useState<RecommendationApiError | null>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!businessId) {
      setStatus("idle");
      setData(null);
      setError(null);
      return;
    }

    const id = ++requestIdRef.current;
    const controller = new AbortController();
    setStatus("loading");

    (async () => {
      try {
        const qs = new URLSearchParams({
          businessId,
          strategy,
          limit: String(limit),
        }).toString();
        const res = await fetch(`/api/recommendations?${qs}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await res.json()) as
          | RecommendationResult
          | RecommendationApiError;

        if (id !== requestIdRef.current) return;

        if (!res.ok || "error" in body) {
          setError(
            "error" in body
              ? body
              : {
                  error: true,
                  code: "QUERY_FAILED",
                  message: "Unexpected response from the server.",
                },
          );
          setStatus("error");
        } else {
          setData(body);
          setError(null);
          setStatus("success");
        }
      } catch (err) {
        if (controller.signal.aborted || id !== requestIdRef.current) return;
        setError({
          error: true,
          code: "DB_UNREACHABLE",
          message:
            err instanceof Error ? err.message : "Could not reach the server.",
        });
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [businessId, strategy, limit]);

  return {
    status,
    data,
    error,
    isLoading: status === "loading",
    isError: status === "error",
  };
}
