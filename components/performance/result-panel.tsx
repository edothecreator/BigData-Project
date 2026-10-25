"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Gauge, TriangleAlert, XCircle } from "lucide-react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/dashboard/chart-card";
import { VerdictBadge } from "@/components/performance/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlanExplanation } from "@/lib/performance/explain-text";
import type { PerformanceResult, PlanRun } from "@/lib/performance/types";
import { cn, formatCompact, formatFull } from "@/lib/utils";

const PLANNER_COLOR = "hsl(var(--brand-mint))";
const BASELINE_COLOR = "hsl(var(--brand-coral))";

// ---------------------------------------------------------------------------
// Verdict + explanation
// ---------------------------------------------------------------------------

function VerdictCard({
  result,
  explanation,
}: {
  result: PerformanceResult;
  explanation: PlanExplanation;
}) {
  const { plan } = result.planner;
  const Icon =
    explanation.tone === "good"
      ? CheckCircle2
      : explanation.tone === "mixed"
        ? TriangleAlert
        : XCircle;
  const toneText =
    explanation.tone === "good"
      ? "text-brand-mint"
      : explanation.tone === "mixed"
        ? "text-brand-amber"
        : "text-brand-coral";

  return (
    <Card
      className={cn(
        "border-l-4",
        plan.usedIndex ? "border-l-brand-mint" : "border-l-brand-coral",
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge plan={plan} />
          {plan.indexName ? (
            <Badge variant="secondary" className="font-mono text-[0.7rem]">
              {plan.indexName}
            </Badge>
          ) : (
            <Badge variant="muted">no index used</Badge>
          )}
          {plan.inMemorySort ? <Badge variant="amber">in-memory sort</Badge> : null}
          <span className="ml-auto flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
            <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold tabular-nums">
              {result.planner.measuredMs} ms
            </span>
            <span className="text-xs text-muted-foreground">
              median of {result.timingSamples}
            </span>
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneText)} aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{explanation.headline}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {explanation.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Comparison chart (planner vs forced COLLSCAN)
// ---------------------------------------------------------------------------

const comparisonConfig: ChartConfig = {
  value: { label: "Value" },
};

function ComparisonBars({
  title,
  description,
  planner,
  baseline,
  format,
  unit,
}: {
  title: string;
  description: string;
  planner: number;
  baseline: number;
  format: (v: number) => string;
  unit: string;
}) {
  const data = [
    { label: "Planner's choice", value: planner, fill: PLANNER_COLOR },
    { label: "Forced COLLSCAN", value: baseline, fill: BASELINE_COLOR },
  ];
  return (
    <ChartCard title={title} description={description}>
      <ChartContainer config={comparisonConfig} className="aspect-auto h-[120px] w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          accessibilityLayer
        >
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => format(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={112}
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            content={
              <ChartTooltipContent
                hideLabel
                nameFormatter={(item) => String(item.payload?.label ?? "")}
                valueFormatter={(v) => `${formatFull(Number(v))} ${unit}`}
              />
            }
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false} minPointSize={2}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="sr-only">
        {`Planner's choice: ${formatFull(planner)} ${unit}. Forced collection scan: ${formatFull(baseline)} ${unit}.`}
      </p>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Metrics table
// ---------------------------------------------------------------------------

function MetricsTable({ planner, baseline }: { planner: PlanRun; baseline: PlanRun }) {
  const rows: { label: string; a: ReactNode; b: ReactNode }[] = [
    {
      label: "Plan stages",
      a: planner.plan.stages.join(" → "),
      b: baseline.plan.stages.join(" → "),
    },
    {
      label: "Access stage",
      a: <VerdictBadge plan={planner.plan} />,
      b: <VerdictBadge plan={baseline.plan} />,
    },
    {
      label: "Index",
      a: planner.plan.indexName ?? "—",
      b: baseline.plan.indexName ?? "—",
    },
    {
      label: "nReturned",
      a: formatFull(planner.metrics.nReturned),
      b: formatFull(baseline.metrics.nReturned),
    },
    {
      label: "totalDocsExamined",
      a: formatFull(planner.metrics.totalDocsExamined),
      b: formatFull(baseline.metrics.totalDocsExamined),
    },
    {
      label: "totalKeysExamined",
      a: formatFull(planner.metrics.totalKeysExamined),
      b: formatFull(baseline.metrics.totalKeysExamined),
    },
    {
      label: "executionTimeMillis",
      a: `${planner.metrics.executionTimeMillis} ms`,
      b: `${baseline.metrics.executionTimeMillis} ms`,
    },
    {
      label: "Measured (median)",
      a: `${planner.measuredMs} ms`,
      b: `${baseline.measuredMs} ms`,
    },
    {
      label: "Samples",
      a: planner.samplesMs.map((s) => `${s}`).join(" / ") + " ms",
      b: baseline.samplesMs.map((s) => `${s}`).join(" / ") + " ms",
    },
  ];

  return (
    <ChartCard
      title="explain() metrics"
      description="executionStats for the planner's choice vs. the same query forced to scan with hint({ $natural: 1 })."
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Metric</TableHead>
            <TableHead>Planner&apos;s choice</TableHead>
            <TableHead>Forced COLLSCAN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                {r.label}
              </TableCell>
              <TableCell className="py-2 font-mono text-xs tabular-nums">{r.a}</TableCell>
              <TableCell className="py-2 font-mono text-xs tabular-nums">{r.b}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ResultPanel({
  result,
  explanation,
}: {
  result: PerformanceResult;
  explanation: PlanExplanation;
}) {
  const { planner, baseline } = result;

  return (
    <div className="space-y-4">
      <VerdictCard result={result} explanation={explanation} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ComparisonBars
          title="Documents examined"
          description="Documents the engine had to read."
          planner={planner.metrics.totalDocsExamined}
          baseline={baseline.metrics.totalDocsExamined}
          format={formatCompact}
          unit="docs"
        />
        <ComparisonBars
          title="Measured time"
          description={`Server-side wall clock, median of ${result.timingSamples} runs.`}
          planner={planner.measuredMs}
          baseline={baseline.measuredMs}
          format={(v) => `${v}`}
          unit="ms"
        />
        <ChartCard
          title={result.kind === "count" ? "Count" : "Result"}
          description={
            result.kind === "count"
              ? "Exact count vs. metadata estimate."
              : "Returned rows (tiny sample — never full documents)."
          }
        >
          {result.kind === "count" ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">countDocuments</dt>
                <dd className="font-mono tabular-nums">
                  {formatFull(result.resultCount)}
                </dd>
              </div>
              {result.estimate ? (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">estimatedDocumentCount</dt>
                    <dd className="font-mono tabular-nums">
                      {formatFull(result.estimate.count)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">estimate time</dt>
                    <dd className="font-mono tabular-nums">
                      {result.estimate.measuredMs} ms
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-mono font-semibold tabular-nums">
                  {formatFull(result.resultCount)}
                </span>{" "}
                <span className="text-muted-foreground">documents returned (limit 25)</span>
              </p>
              {result.sample.length === 0 ? (
                <p className="text-xs text-muted-foreground">No matching businesses.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {result.sample.map((s, i) => (
                    <li key={`${s.name}-${i}`} className="truncate">
                      <span className="font-medium">{s.name}</span>{" "}
                      <span className="text-muted-foreground">
                        {s.city}, {s.state}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      <MetricsTable planner={planner} baseline={baseline} />

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="label-eyebrow mb-1">Effective query (built server-side)</p>
        <code className="block overflow-x-auto whitespace-pre font-mono text-xs text-foreground">
          {result.querySummary}
        </code>
      </div>
    </div>
  );
}

export function ResultPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Running scenario">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="ml-auto h-8 w-32" />
          </div>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-[100px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-2 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
