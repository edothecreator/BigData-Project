"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

/**
 * A thin, theme-aware wrapper around Recharts, modeled on the shadcn chart
 * component. It injects CSS variables (--color-<key>) derived from a config so
 * series colors stay in sync with the ReviewScope design tokens, and provides a
 * polished tooltip and legend.
 */

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, cfg]) => cfg.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  const css = `[data-chart=${id}] {\n${colorConfig
    .map(([key, cfg]) => (cfg.color ? `  --color-${key}: ${cfg.color};` : null))
    .filter(Boolean)
    .join("\n")}\n}`;

  // eslint-disable-next-line react/no-danger
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  value?: number | string;
  name?: string;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
};

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: React.ReactNode;
    className?: string;
    labelFormatter?: (label: React.ReactNode) => React.ReactNode;
    valueFormatter?: (value: number | string | undefined) => React.ReactNode;
    nameFormatter?: (item: TooltipPayloadItem) => React.ReactNode;
    hideLabel?: boolean;
  }
>(
  (
    {
      active,
      payload,
      label,
      className,
      labelFormatter,
      valueFormatter,
      nameFormatter,
      hideLabel,
    },
    ref,
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "min-w-[9rem] rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md",
          className,
        )}
      >
        {!hideLabel && label != null ? (
          <div className="mb-1.5 font-medium text-popover-foreground">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          {payload.map((item, index) => {
            const key = String(item.dataKey ?? item.name ?? index);
            const indicatorColor =
              item.color ?? config[key]?.color ?? "hsl(var(--chart-1))";
            const name =
              nameFormatter?.(item) ??
              config[key]?.label ??
              item.name ??
              key;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: indicatorColor }}
                  />
                  <span className="text-muted-foreground">{name}</span>
                </div>
                <span className="font-mono font-medium tabular-nums text-popover-foreground">
                  {valueFormatter ? valueFormatter(item.value) : item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
  useChart,
};
