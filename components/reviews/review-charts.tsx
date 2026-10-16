"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ChartCard, ChartEmptyState } from "@/components/dashboard/chart-card";
import type { ReviewAnalytics } from "@/lib/reviews/types";
import { formatCompact, formatFull } from "@/lib/utils";

const config: ChartConfig = { count: { label: "Reviews", color: "hsl(var(--chart-1))" } };
const tooltip = <ChartTooltipContent valueFormatter={value => formatFull(Number(value))} />;

export function ReviewCharts({ data }: { data: ReviewAnalytics }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Review Rating Distribution" description="Review counts at each rating, from 1 to 5 stars.">
        {!data.ratingDistribution.some(row => row.count > 0) ? <ChartEmptyState message="No review ratings available." /> : (
          <ChartContainer config={config} className="aspect-auto h-[280px] w-full" aria-label="Review counts by star rating">
            <BarChart accessibilityLayer data={data.ratingDistribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="stars" tickFormatter={value => `${value} ★`} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCompact} width={55} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={label => `${label} stars`} valueFormatter={value => formatFull(Number(value))} />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>
      <ChartCard title="Reviews Over Time" description="Annual review volume, grouped by the review date's year.">
        {!data.reviewsOverTime.length ? <ChartEmptyState message="No dated reviews available." /> : (
          <ChartContainer config={config} className="aspect-auto h-[280px] w-full" aria-label="Review counts per year">
            <AreaChart accessibilityLayer data={data.reviewsOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="year" minTickGap={24} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCompact} width={55} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={tooltip} />
              <Area type="linear" dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.15} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>
    </div>
  );
}
