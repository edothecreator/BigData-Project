"use client";

import * as React from "react";

import type { ScenarioId, ScenarioParams } from "@/lib/performance/scenarios";
import type {
  IndexesResult,
  PerformanceApiError,
  PerformanceResult,
} from "@/lib/performance/types";

type Status = "idle" | "loading" | "success" | "error";

/** Runs an allowlisted performance scenario on demand. */
export function usePerformanceRun() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [result, setResult] = React.useState<PerformanceResult | null>(null);
  const [error, setError] = React.useState<PerformanceApiError | null>(null);
  const requestIdRef = React.useRef(0);

  const run = React.useCallback(
    async (scenario: ScenarioId, params: ScenarioParams) => {
      const id = ++requestIdRef.current;
      setStatus("loading");
      setError(null);

      const qs = new URLSearchParams({ scenario });
      if (params.state) qs.set("state", params.state);
      if (params.city) qs.set("city", params.city);
      if (params.search) qs.set("search", params.search);

      try {
        const res = await fetch(`/api/performance?${qs.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as
          | PerformanceResult
          | PerformanceApiError;

        if (id !== requestIdRef.current) return;

        if (!res.ok || "error" in body) {
          setError(
            "error" in body
              ? body
              : {
                  error: true,
                  code: "QUERY_FAILED",
                  message: "Unexpected response.",
                },
          );
          setStatus("error");
        } else {
          setResult(body);
          setStatus("success");
        }
      } catch (cause) {
        if (id !== requestIdRef.current) return;
        setError({
          error: true,
          code: "DB_UNREACHABLE",
          message:
            cause instanceof Error
              ? cause.message
              : "Could not reach the server.",
        });
        setStatus("error");
      }
    },
    [],
  );

  return {
    run,
    result,
    error,
    status,
    isRunning: status === "loading",
  };
}

/** Fetches the current index listing once. */
export function useBusinessIndexes() {
  const [indexes, setIndexes] = React.useState<IndexesResult | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/performance/indexes", {
        cache: "no-store",
      });
      if (!res.ok) return;
      setIndexes((await res.json()) as IndexesResult);
    } catch {
      // Non-fatal; the panel simply stays empty.
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { indexes, refresh };
}
