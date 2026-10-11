"use client";

import * as React from "react";

import type { DashboardData, DashboardError } from "@/lib/dashboard/types";

type Status = "idle" | "loading" | "success" | "error";

interface State {
  status: Status;
  data: DashboardData | null;
  error: DashboardError | null;
  /** Client-side timestamp of the last successful fetch. */
  lastRefreshed: Date | null;
  /** True while a background refresh is in flight (data already present). */
  isRefreshing: boolean;
}

const INITIAL: State = {
  status: "idle",
  data: null,
  error: null,
  lastRefreshed: null,
  isRefreshing: false,
};

/**
 * Fetches the dashboard payload from the API. Handles initial load, manual
 * refresh (which always requests fresh server data via no-store), and honest
 * error reporting distinguishing an unreachable database from other failures.
 */
export function useDashboardData() {
  const [state, setState] = React.useState<State>(INITIAL);

  const fetchData = React.useCallback(async (isManualRefresh: boolean) => {
    setState((prev) => ({
      ...prev,
      status: prev.data ? prev.status : "loading",
      isRefreshing: isManualRefresh,
      error: isManualRefresh ? prev.error : null,
    }));

    try {
      const res = await fetch("/api/dashboard", {
        cache: "no-store",
        headers: { "cache-control": "no-cache" },
      });

      const body = (await res.json()) as DashboardData | DashboardError;

      if (!res.ok || "error" in body) {
        const err: DashboardError =
          "error" in body
            ? body
            : {
                error: true,
                code: "QUERY_FAILED",
                message: "Unexpected response from the dashboard API.",
              };
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err,
          isRefreshing: false,
        }));
        return;
      }

      setState({
        status: "success",
        data: body,
        error: null,
        lastRefreshed: new Date(),
        isRefreshing: false,
      });
    } catch {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: {
          error: true,
          code: "DB_UNREACHABLE",
          message:
            "Could not reach the dashboard API. Check that the development server is running.",
        },
        isRefreshing: false,
      }));
    }
  }, []);

  React.useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  const refresh = React.useCallback(() => fetchData(true), [fetchData]);

  return {
    ...state,
    refresh,
    isLoading: state.status === "loading",
    isError: state.status === "error",
  };
}
