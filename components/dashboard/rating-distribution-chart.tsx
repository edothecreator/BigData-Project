"use client";

import * as React from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ChartCard,
  ChartEmptyState,
} from "@/components/dashboard/chart-card";
import type { RatingBucket } from "@/lib/dashboard/types";
import { formatCompact, formatFull } from "@/lib/utils";

const config: ChartConfig = {
  count: { label: "Businesses", color: "hsl(var(--chart-1))" },
};

export function RatingDistributionChart({
  data,
}: {
  data: RatingBucket[];
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <ChartCard
      title="Business Rating Distribution"
      description="Number of businesses at each star rating."
    >
      {data.length === 0 ? (
        <ChartEmptyState message="No rating data available." />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              const idx = state?.activeTooltipIndex;
              setActiveIndex(typeof idx === "number" ? idx : null);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `${label} stars`}
                  valueFormatter={(v) => formatFull(Number(v))}
                  nameFormatter={() => "Businesses"}
                />
              }
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill="hsl(var(--chart-1))"
                  fillOpacity={
                    activeIndex === null || activeIndex === index ? 1 : 0.45
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
