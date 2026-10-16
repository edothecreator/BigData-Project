"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartEmptyState } from "@/components/dashboard/chart-card";
import { formatCompact, formatFull } from "@/lib/utils";

export function MarketChart({ rows, metric = "count" }: {
  rows: { label: string; count: number; averageReviews?: number | null }[];
  metric?: "count" | "averageReviews";
}) {
  if (!rows.length) return <ChartEmptyState message="No matching market data available." />;
  return (
    <ChartContainer config={{
      [metric]: { label: metric === "count" ? "Businesses" : "Avg reviews per business", color: "hsl(var(--chart-2))" },
    }} className="aspect-auto h-[340px] w-full" role="img" aria-label={metric === "count" ? "Business counts by market; exact figures in the table below" : "Average review counts by category"}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }} accessibilityLayer>
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <YAxis type="category" dataKey="label" width={115} tickLine={false} axisLine={false}
          tickFormatter={(value: string) => value.length > 17 ? `${value.slice(0, 16)}…` : value} />
        <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} content={
          <ChartTooltipContent valueFormatter={(value) => formatFull(Number(value))} />
        } />
        <Bar dataKey={metric} fill="var(--color-count, var(--color-averageReviews))" radius={[0, 5, 5, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
