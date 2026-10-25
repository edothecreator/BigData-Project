"use client";

import { Check, KeyRound, Plus, RefreshCw } from "lucide-react";

import { ChartCard } from "@/components/dashboard/chart-card";
import { ErrorState } from "@/components/dashboard/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MANAGED_INDEXES,
  type ManagedIndexId,
} from "@/lib/performance/catalog";
import type { IndexesResult, PerformanceApiError } from "@/lib/performance/types";

function KeyBadges({ keys }: { keys: { field: string; direction: number | string }[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <Badge key={k.field} variant="secondary" className="font-mono text-[0.7rem]">
          {k.field}: {String(k.direction)}
        </Badge>
      ))}
    </span>
  );
}

/**
 * Current indexes on `businesses` (read-only listing) plus the lab's small,
 * hardcoded allowlist of helpful indexes that can be created if missing.
 * There is intentionally no drop/modify control.
 */
export function IndexesPanel({
  data,
  error,
  isLoading,
  pending,
  onRefresh,
  onEnsure,
}: {
  data: IndexesResult | null;
  error: PerformanceApiError | null;
  isLoading: boolean;
  pending: ManagedIndexId | null;
  onRefresh: () => void;
  onEnsure: (id: ManagedIndexId) => void;
}) {
  if (error && !data) {
    return <ErrorState error={error} onRetry={onRefresh} isRetrying={isLoading} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard
        title="Current indexes"
        description="Live listIndexes() on the businesses collection (read-only)."
        action={
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh index list"
          >
            <RefreshCw className={isLoading ? "animate-spin" : undefined} />
          </Button>
        }
      >
        {!data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {data.indexes.map((idx) => (
              <li
                key={idx.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="font-mono text-xs font-medium">{idx.name}</span>
                </span>
                <KeyBadges keys={idx.keys} />
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      <ChartCard
        title="Lab index allowlist"
        description="The only indexes this lab may create — idempotent, non-unique, same as scripts/ensure-indexes.js. Nothing is ever dropped."
      >
        {!data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {data.managed.map((m) => {
              const spec = MANAGED_INDEXES[m.id];
              const busy = pending === m.id;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-xs font-medium">{m.id}</p>
                    <p className="text-xs text-muted-foreground">{spec.purpose}</p>
                  </div>
                  {m.present ? (
                    <Badge variant="mint" className="gap-1">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Present
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEnsure(m.id)}
                      disabled={pending !== null}
                    >
                      <Plus className={busy ? "animate-pulse" : undefined} />
                      {busy ? "Creating…" : "Create index"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {error && data ? (
          <p className="mt-3 text-xs text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </ChartCard>
    </div>
  );
}
