"use client";

import * as React from "react";

import type { MapApiError, MapResult } from "@/lib/map/types";

type Status = "idle" | "loading" | "success" | "error";

export interface MapFilters {
  state: string;
  status: "any" | "open" | "closed";
  minRating: number;
  limit: number;
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  state: "",
  status: "any",
  minRating: 0,
  limit: 500,
};

/** Fetches bounded map points for the active filters, guarding stale responses. */
export function useMapData(filters: MapFilters) {
  const [status, setStatus] = React.useState<Status>("loading");
  const [data, setData] = React.useState<MapResult | null>(null);
  const [error, setError] = React.useState<MapApiError | null>(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const requestIdRef = React.useRef(0);

  const query = React.useMemo(() => {
    const qs = new URLSearchParams();
    if (filters.state) qs.set("state", filters.state);
    qs.set("status", filters.status);
    qs.set("minRating", String(filters.minRating));
    qs.set("limit", String(filters.limit));
    return qs.toString();
  }, [filters]);

  React.useEffect(() => {
    const id = ++requestIdRef.current;
    const controller = new AbortController();
    setIsFetching(true);
    if (!data) setStatus("loading");

    (async () => {
      try {
        const res = await fetch(`/api/map?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await res.json()) as MapResult | MapApiError;
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
      } finally {
        if (id === requestIdRef.current) setIsFetching(false);
      }
    })();

    return () => controller.abort();
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    data,
    error,
    isFetching,
    isLoading: status === "loading",
    isError: status === "error",
  };
}
