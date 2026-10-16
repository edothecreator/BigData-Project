"use client";

import * as React from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { SeedOption } from "@/lib/recommendations/types";

/** Debounced search over businesses to pick a recommendation seed. */
export function useSeedSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 300);
  const [options, setOptions] = React.useState<SeedOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    const id = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const qs = new URLSearchParams({ limit: "10" });
        if (debounced) qs.set("search", debounced);
        const res = await fetch(`/api/recommendations/seeds?${qs.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { items: SeedOption[] };
        if (id === requestIdRef.current) setOptions(body.items ?? []);
      } catch {
        // Non-fatal; leave previous options.
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debounced]);

  return { options, loading };
}
