"use client";

import { Building2, DoorOpen, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BusinessSummary } from "@/lib/businesses/types";
import { formatFull, formatPercent } from "@/lib/utils";

/**
 * Compact summary over the ENTIRE filtered result set (computed server-side via
 * aggregation), not just the visible page.
 */
export function SummaryMetrics({
  summary,
  isFetching,
}: {
  summary: BusinessSummary;
  isFetching: boolean;
}) {
  const items = [
    {
      label: "Matching businesses",
      value: formatFull(summary.total),
      icon: Building2,
      accent: "--brand-indigo",
    },
    {
      label: "Average rating",
      value: summary.averageRating === null ? "—" : summary.averageRating.toFixed(2),
      icon: Star,
      accent: "--brand-amber",
    },
    {
      label: "Open",
      value:
        summary.total === 0
          ? "—"
          : `${formatFull(summary.openCount)} · ${formatPercent(summary.openRatio)}`,
      icon: DoorOpen,
      accent: "--brand-mint",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: `hsl(var(${item.accent}) / 0.12)` }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: `hsl(var(${item.accent}))` }}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <p className="label-eyebrow">{item.label}</p>
                {isFetching ? (
                  <Skeleton className="mt-1.5 h-6 w-20" />
                ) : (
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                    {item.value}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
