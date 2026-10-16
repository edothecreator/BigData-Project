"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ReviewAnalytics, ReviewApiError } from "@/lib/reviews/types";

export function useReviewsData() {
  const [data, setData] = React.useState<ReviewAnalytics | null>(null);
  const [error, setError] = React.useState<ReviewApiError | null>(null);
  const [isFetching, setFetching] = React.useState(true);
  const controller = React.useRef<AbortController | null>(null);
  const fetchData = React.useCallback(async (manual = false) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setFetching(true);
    try {
      const response = await fetch("/api/reviews", { cache: "no-store", signal: current.signal });
      const body = await response.json() as ReviewAnalytics | ReviewApiError;
      if (!response.ok || "error" in body) {
        const failure: ReviewApiError = "error" in body ? body : {
          error: true, code: "QUERY_FAILED", message: "Unexpected response from the reviews API.",
        };
        if (!current.signal.aborted) {
          setError(failure);
          if (manual) toast.error("Refresh failed", { description: failure.message });
        }
        return;
      }
      if (!current.signal.aborted) {
        setData(body);
        setError(null);
        if (manual) toast.success("Review analytics refreshed");
      }
    } catch {
      if (!current.signal.aborted) {
        setError({ error: true, code: "QUERY_FAILED", message: "Could not reach the reviews API. Check the application server and retry." });
        if (manual) toast.error("Refresh failed");
      }
    } finally {
      if (!current.signal.aborted) setFetching(false);
    }
  }, []);
  React.useEffect(() => {
    void fetchData();
    return () => controller.current?.abort();
  }, [fetchData]);
  return { data, error, isFetching, refresh: () => { void fetchData(true); } };
}
