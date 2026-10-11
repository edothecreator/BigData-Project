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
import type { CategoryCount } from "@/lib/dashboard/types";
import { formatCompact, formatFull } from "@/lib/utils";

const config: ChartConfig = {
  count: { label: "Businesses", color: "hsl(var(--chart-2))" },
};

function truncate(value: string, max = 18): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function TopCategoriesChart({ data }: { data: CategoryCount[] }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <ChartCard
      title="Most Common Categories"
      description="Top categories after splitting the comma-separated field."
    >
      {data.length === 0 ? (
        <ChartEmptyState message="No category data available." />
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
              dataKey="category"
              tickLine={false}
              axisLine={false}
              width={120}
              tickFormatter={(v: string) => truncate(v)}
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
                  fill="hsl(var(--chart-2))"
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
