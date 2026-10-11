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
import type { CityCount } from "@/lib/dashboard/types";
import { formatCompact, formatFull } from "@/lib/utils";

const config: ChartConfig = {
  count: { label: "Businesses", color: "hsl(var(--chart-3))" },
};

export function TopCitiesChart({ data }: { data: CityCount[] }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <ChartCard
      title="Top Cities by Business Count"
      description="Grouped by city and state together."
    >
      {data.length === 0 ? (
        <ChartEmptyState message="No city data available." />
      ) : (
        <ChartContainer
          config={config}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              const idx = state?.activeTooltipIndex;
              setActiveIndex(typeof idx === "number" ? idx : null);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={
                <ChartTooltipContent
                  valueFormatter={(v) => formatFull(Number(v))}
                  nameFormatter={() => "Businesses"}
                />
              }
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill="hsl(var(--chart-3))"
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
