"use client";

import { Database, Gauge, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartCard,
} from "@/components/dashboard/chart-card";
import type { PerformanceResult } from "@/lib/performance/types";
import { cn, formatFull } from "@/lib/utils";

function MetricRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="font-mono text-sm font-medium tabular-nums">
          {value}
        </span>
        {hint ? (
          <span className="ml-2 text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </div>
  );
}

/** Horizontal comparison of docs examined vs returned (scan efficiency). */
function EfficiencyBar({
  examined,
  returned,
}: {
  examined: number;
  returned: number;
}) {
  const max = Math.max(examined, returned, 1);
  const ePct = (examined / max) * 100;
  const rPct = (returned / max) * 100;
  // Efficient when examined ≈ returned; wasteful when examined >> returned.
  const wasteful = examined > returned * 4 && examined > 100;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Documents examined</span>
          <span className="font-mono tabular-nums">{formatFull(examined)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              wasteful ? "bg-brand-coral" : "bg-brand-mint",
            )}
            style={{ width: `${ePct}%` }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Documents returned</span>
          <span className="font-mono tabular-nums">{formatFull(returned)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-indigo transition-all"
            style={{ width: `${rPct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {wasteful
          ? "Examined far more documents than it returned — a sign of a scan without a selective index."
          : "Examined roughly as many documents as it returned — an efficient, targeted access path."}
      </p>
    </div>
  );
}

export function ResultPanel({ result }: { result: PerformanceResult }) {
  const { plan, metrics } = result;
  const ixscan = plan.usedIndex;

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <Card
        className={cn(
          "border-l-4",
          ixscan ? "border-l-brand-mint" : "border-l-brand-coral",
        )}
      >
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
              ixscan ? "bg-brand-mint/15" : "bg-brand-coral/15",
            )}
          >
            {ixscan ? (
              <Zap className="h-5 w-5 text-brand-mint" />
            ) : (
              <Database className="h-5 w-5 text-brand-coral" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                {ixscan ? "Index scan (IXSCAN)" : "Collection scan (COLLSCAN)"}
              </span>
              {plan.indexName ? (
                <Badge variant="mint" className="font-mono text-[0.7rem]">
                  {plan.indexName}
                </Badge>
              ) : (
                <Badge variant="muted">no index used</Badge>
              )}
              {plan.inMemorySort ? (
                <Badge variant="amber">in-memory sort</Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ixscan
                ? "MongoDB used an index to locate matching documents directly."
                : "MongoDB read through the collection because no index could serve this query shape."}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold tabular-nums">
              {result.measuredMs} ms
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Efficiency */}
        <ChartCard
          title="Scan efficiency"
          description="How many documents the engine had to read vs. how many it returned."
        >
          <EfficiencyBar
            examined={metrics.totalDocsExamined}
            returned={metrics.nReturned}
          />
        </ChartCard>

        {/* Raw metrics */}
        <ChartCard title="explain() metrics" description="From executionStats.">
          <div>
            <MetricRow label="Top plan stage" value={plan.topStage} />
            <MetricRow label="Access stage" value={plan.scanStage} />
            <MetricRow
              label="Documents examined"
              value={formatFull(metrics.totalDocsExamined)}
            />
            <MetricRow
              label="Index keys examined"
              value={formatFull(metrics.totalKeysExamined)}
            />
            <MetricRow
              label="Documents returned"
              value={formatFull(metrics.nReturned)}
            />
            <MetricRow
              label="MongoDB exec time"
              value={`${metrics.executionTimeMillis} ms`}
            />
            {result.kind === "count" ? (
              <MetricRow
                label="Exact count"
                value={formatFull(result.resultCount)}
                hint="countDocuments"
              />
            ) : null}
            {result.estimatedCount !== null ? (
              <MetricRow
                label="Metadata estimate"
                value={formatFull(result.estimatedCount)}
                hint="O(1), whole collection"
              />
            ) : null}
          </div>
        </ChartCard>
      </div>

      {/* Query detail */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="label-eyebrow mb-1">Effective query (built server-side)</p>
        <code className="block overflow-x-auto font-mono text-xs text-foreground">
          db.businesses.{result.kind === "count" ? "countDocuments" : "find"}(
          {result.querySummary})
        </code>
      </div>
    </div>
  );
}
