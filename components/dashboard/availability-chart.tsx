"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

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
import type { AvailabilityBreakdown } from "@/lib/dashboard/types";
import { formatFull, formatPercent } from "@/lib/utils";

const config: ChartConfig = {
  open: { label: "Open", color: "hsl(var(--brand-mint))" },
  closed: { label: "Closed", color: "hsl(var(--brand-coral))" },
};

export function AvailabilityChart({
  data,
}: {
  data: AvailabilityBreakdown;
}) {
  const total = data.open + data.closed;

  const chartData = React.useMemo(
    () => [
      { key: "open", label: "Open", value: data.open, fill: "hsl(var(--brand-mint))" },
      { key: "closed", label: "Closed", value: data.closed, fill: "hsl(var(--brand-coral))" },
    ],
    [data.open, data.closed],
  );

  return (
    <ChartCard
      title="Business Availability"
      description={
        data.unknown > 0
          ? `Open vs closed. ${formatFull(data.unknown)} with unknown status excluded.`
          : "Share of businesses currently open vs closed."
      }
    >
      {total === 0 ? (
        <ChartEmptyState message="No availability data." />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
          <ChartContainer
            config={config}
            className="aspect-square h-[200px] w-[200px]"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    valueFormatter={(v) => formatFull(Number(v))}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={62}
                outerRadius={90}
                strokeWidth={2}
                stroke="hsl(var(--card))"
                isAnimationActive={false}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox)) return null;
                    const { cx, cy } = viewBox as { cx: number; cy: number };
                    return (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={cx}
                          y={cy - 6}
                          className="fill-foreground text-2xl font-semibold"
                        >
                          {formatPercent(data.openRatio)}
                        </tspan>
                        <tspan
                          x={cx}
                          y={cy + 14}
                          className="fill-muted-foreground text-xs"
                        >
                          open
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <ul className="w-full max-w-[180px] space-y-3">
            {chartData.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-[3px]"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-muted-foreground">{entry.label}</span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatFull(entry.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
