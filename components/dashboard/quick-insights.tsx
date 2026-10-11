"use client";

import { Lightbulb } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Insight } from "@/lib/dashboard/types";

export function QuickInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-brand-amber" />
          Quick Insights
        </CardTitle>
        <CardDescription className="text-xs">
          Observations derived from the live query results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <p className="label-eyebrow">{insight.label}</p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                {insight.value}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {insight.detail}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
