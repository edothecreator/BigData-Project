"use client";

import * as React from "react";
import { toast } from "sonner";

import type { BusinessApiError } from "@/lib/businesses/types";
import type { InsightsData } from "@/lib/insights/types";

export function useInsightsData(category: string, state: string) {
  const [result, setResult] = React.useState<{
    data: InsightsData | null; error: BusinessApiError | null; loading: boolean;
  }>({ data: null, error: null, loading: true });
  const [revision, setRevision] = React.useState(0);
  const manualRefresh = React.useRef(false);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (state) params.set("state", state);
    // Clear previous results on a filter change: old numbers must never appear
    // under the newly selected category/state. Abort prevents out-of-order UI.
    setResult({ data: null, error: null, loading: true });
    async function fetchData() {
      try {
        const response = await fetch(`/api/insights?${params}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json() as InsightsData | BusinessApiError;
        if (controller.signal.aborted) return;
        if (!response.ok || "error" in body) {
          const error: BusinessApiError = "error" in body ? body : {
            error: true, code: "QUERY_FAILED", message: "Unexpected response from the Market Insights API.",
          };
          setResult({ data: null, error, loading: false });
          if (manualRefresh.current) toast.error("Refresh failed", { description: error.message });
        } else {
          setResult({ data: body, error: null, loading: false });
          if (manualRefresh.current) toast.success("Market Insights refreshed");
        }
      } catch {
        if (controller.signal.aborted) return;
        setResult({ data: null, loading: false, error: {
          error: true, code: "QUERY_FAILED", message: "Could not reach the Market Insights API. Check that the app is running and retry.",
        } });
        if (manualRefresh.current) toast.error("Refresh failed");
      } finally {
        if (!controller.signal.aborted) manualRefresh.current = false;
      }
    }
    void fetchData();
    return () => controller.abort();
  }, [category, state, revision]);

  const refresh = React.useCallback(() => {
    manualRefresh.current = true;
    setRevision((value) => value + 1);
  }, []);
  return { ...result, refresh };
}
