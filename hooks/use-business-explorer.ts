"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  apiQueryFromState,
  DEFAULT_STATE,
  type ExplorerState,
  paramsFromState,
  stateFromParams,
} from "@/lib/businesses/filter-state";
import type {
  BusinessApiError,
  BusinessListResult,
} from "@/lib/businesses/types";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Owns Business Explorer state: filters/sort/pagination, URL synchronization,
 * debounced search, and the list fetch with stale-response protection.
 *
 * A monotonically increasing request id guards against out-of-order responses:
 * only the newest request is allowed to commit results, so a slow earlier
 * response can never overwrite a newer one.
 */
export function useBusinessExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from the URL once; subsequent URL writes are driven by state.
  const [state, setState] = React.useState<ExplorerState>(() =>
    stateFromParams(new URLSearchParams(searchParams.toString())),
  );

  const [status, setStatus] = React.useState<Status>("loading");
  const [data, setData] = React.useState<BusinessListResult | null>(null);
  const [error, setError] = React.useState<BusinessApiError | null>(null);
  const [isFetching, setIsFetching] = React.useState(false);

  // Debounce only the free-text search; other controls apply immediately.
  const debouncedSearch = useDebouncedValue(state.search, 350);

  const requestIdRef = React.useRef(0);

  // Keep the URL in sync with state (shallow replace, no scroll jump).
  React.useEffect(() => {
    const qs = paramsFromState(state).toString();
    const current = searchParams.toString();
    if (qs !== current) {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pathname]);

  const query = apiQueryFromState(state, debouncedSearch);

  // Fetch whenever the effective query changes.
  React.useEffect(() => {
    const id = ++requestIdRef.current;
    const controller = new AbortController();

    setIsFetching(true);
    if (!data) setStatus("loading");

    (async () => {
      try {
        const res = await fetch(`/api/businesses?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await res.json()) as
          | BusinessListResult
          | BusinessApiError;

        // Ignore responses that are not from the latest request.
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
            err instanceof Error
              ? err.message
              : "Could not reach the server.",
        });
        setStatus("error");
      } finally {
        if (id === requestIdRef.current) setIsFetching(false);
      }
    })();

    return () => controller.abort();
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- State update helpers --------------------------------------------

  /** Patch filters; any change that affects results resets to page 1. */
  const update = React.useCallback(
    (patch: Partial<ExplorerState>, resetPage = true) => {
      setState((prev) => ({
        ...prev,
        ...patch,
        page: resetPage && !("page" in patch) ? 1 : (patch.page ?? prev.page),
      }));
    },
    [],
  );

  const setPage = React.useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const toggleSort = React.useCallback(
    (field: ExplorerState["sort"]) => {
      setState((prev) => {
        if (prev.sort === field) {
          return {
            ...prev,
            direction: prev.direction === "asc" ? "desc" : "asc",
            page: 1,
          };
        }
        // New field: sensible default direction (text asc, numeric desc).
        const direction = field === "name" || field === "city" ? "asc" : "desc";
        return { ...prev, sort: field, direction, page: 1 };
      });
    },
    [],
  );

  const reset = React.useCallback(() => setState({ ...DEFAULT_STATE }), []);

  const activeFilterCount = React.useMemo(() => {
    let n = 0;
    if (state.search.trim()) n++;
    if (state.city) n++;
    if (state.state) n++;
    if (state.category) n++;
    if (state.minRating > 0) n++;
    if (state.status !== "any") n++;
    return n;
  }, [state]);

  return {
    state,
    update,
    setPage,
    toggleSort,
    reset,
    activeFilterCount,
    data,
    error,
    status,
    isFetching,
    isLoading: status === "loading",
    isError: status === "error",
  };
}
