"use client";

import * as React from "react";

import type { FilterOptions } from "@/lib/businesses/types";

/** Fetches the filter dropdown options from the server exactly once. */
export function useFilterOptions() {
  const [options, setOptions] = React.useState<FilterOptions | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/businesses/filters", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as FilterOptions;
        if (!cancelled) setOptions(body);
      } catch {
        // Non-fatal: filters simply fall back to free-text entry.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loaded };
}
