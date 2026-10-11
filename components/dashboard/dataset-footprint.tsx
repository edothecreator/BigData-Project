"use client";

import { CheckCircle2, CircleSlash } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CollectionStat } from "@/lib/dashboard/types";
import { formatCompact, formatFull } from "@/lib/utils";

export function DatasetFootprint({
  collections,
}: {
  collections: CollectionStat[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dataset Footprint</CardTitle>
        <CardDescription className="text-xs">
          Estimated document counts across the expected collections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {collections.map((c) => (
            <div
              key={c.key}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="label-eyebrow">{c.label}</p>
                {c.available ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-mint" />
                ) : (
                  <CircleSlash className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              {c.available && c.count !== null ? (
                <>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {formatCompact(c.count)}
                  </p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {formatFull(c.count)} docs
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    Not imported
                  </p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Collection missing
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
