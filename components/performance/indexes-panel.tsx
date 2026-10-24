"use client";

import { KeyRound } from "lucide-react";

import { ChartCard } from "@/components/dashboard/chart-card";
import { Badge } from "@/components/ui/badge";
import type { IndexesResult } from "@/lib/performance/types";

/** Read-only listing of the current indexes on the businesses collection. */
export function IndexesPanel({ data }: { data: IndexesResult | null }) {
  return (
    <ChartCard
      title="Current indexes"
      description="Indexes on the businesses collection (read-only)."
    >
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading indexes…</p>
      ) : (
        <ul className="space-y-2">
          {data.indexes.map((idx) => (
            <li
              key={idx.name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-xs font-medium">
                  {idx.name}
                </span>
              </span>
              <span className="flex flex-wrap gap-1">
                {idx.keys.map((k) => (
                  <Badge
                    key={k.field}
                    variant="secondary"
                    className="font-mono text-[0.7rem]"
                  >
                    {k.field}: {String(k.direction)}
                  </Badge>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
