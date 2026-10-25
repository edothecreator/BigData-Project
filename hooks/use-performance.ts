"use client";

import * as React from "react";

import type { ManagedIndexId, ScenarioId } from "@/lib/performance/catalog";
import type {
  EnsureIndexResult,
  IndexesResult,
  PerformanceApiError,
  PerformanceResult,
} from "@/lib/performance/types";

type Status = "idle" | "loading" | "success" | "error";

export interface ScenarioInput {
  state?: string;
  city?: string;
  search?: string;
}

const networkError = (cause: unknown): PerformanceApiError => ({
  error: true,
  code: "DB_UNREACHABLE",
  message:
    cause instanceof Error
      ? `Could not reach the server: ${cause.message}`
      : "Could not reach the server.",
});

/** Parse a JSON response into either the payload or the error envelope. */
async function readJson<T>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; error: PerformanceApiError }> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        error: true,
        code: "QUERY_FAILED",
        message: `Unexpected response (HTTP ${res.status}).`,
      },
    };
  }
  if (!res.ok || (typeof body === "object" && body !== null && "error" in body)) {
    return { ok: false, error: body as PerformanceApiError };
  }
  return { ok: true, data: body as T };
}

/** Runs an allowlisted performance scenario on demand; ignores stale replies. */
export function usePerformanceRun() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [result, setResult] = React.useState<PerformanceResult | null>(null);
  const [error, setError] = React.useState<PerformanceApiError | null>(null);
  const requestIdRef = React.useRef(0);

  const run = React.useCallback(
    async (scenario: ScenarioId, params: ScenarioInput) => {
      const id = ++requestIdRef.current;
      setStatus("loading");

      const qs = new URLSearchParams({ scenario });
      if (params.state) qs.set("state", params.state);
      if (params.city) qs.set("city", params.city);
      if (params.search) qs.set("search", params.search);

      try {
        const res = await fetch(`/api/performance?${qs.toString()}`, {
          cache: "no-store",
        });
        const parsed = await readJson<PerformanceResult>(res);
        if (id !== requestIdRef.current) return;
        if (parsed.ok) {
          setResult(parsed.data);
          setError(null);
          setStatus("success");
        } else {
          setError(parsed.error);
          setStatus("error");
        }
      } catch (cause) {
        if (id !== requestIdRef.current) return;
        setError(networkError(cause));
        setStatus("error");
      }
    },
    [],
  );

  return { run, result, error, status, isRunning: status === "loading" };
}

/** Current indexes on `businesses`, plus the allowlisted "ensure index" action. */
export function useBusinessIndexes() {
  const [data, setData] = React.useState<IndexesResult | null>(null);
  const [error, setError] = React.useState<PerformanceApiError | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pending, setPending] = React.useState<ManagedIndexId | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/performance/indexes", { cache: "no-store" });
      const parsed = await readJson<IndexesResult>(res);
      if (parsed.ok) {
        setData(parsed.data);
        setError(null);
      } else {
        setError(parsed.error);
      }
    } catch (cause) {
      setError(networkError(cause));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Create one allowlisted index if missing. Resolves to the result or error. */
  const ensure = React.useCallback(
    async (
      index: ManagedIndexId,
    ): Promise<
      { ok: true; data: EnsureIndexResult } | { ok: false; error: PerformanceApiError }
    > => {
      setPending(index);
      try {
        const res = await fetch("/api/performance/indexes", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index }),
        });
        const parsed = await readJson<EnsureIndexResult>(res);
        if (parsed.ok) {
          setData(parsed.data);
          setError(null);
        }
        return parsed;
      } catch (cause) {
        return { ok: false, error: networkError(cause) };
      } finally {
        setPending(null);
      }
    },
    [],
  );

  return { data, error, isLoading, pending, refresh, ensure };
}
