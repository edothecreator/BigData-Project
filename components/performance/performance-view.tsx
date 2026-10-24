"use client";

import * as React from "react";
import { Info, Play } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResultPanel } from "@/components/performance/result-panel";
import { IndexesPanel } from "@/components/performance/indexes-panel";
import {
  useBusinessIndexes,
  usePerformanceRun,
} from "@/hooks/use-performance";
import { SCENARIO_CATALOG } from "@/lib/performance/catalog";
import type { ScenarioId } from "@/lib/performance/scenarios";
import { cn } from "@/lib/utils";

export function PerformanceView() {
  const [scenarioId, setScenarioId] = React.useState<ScenarioId>("state-city");
  const [state, setState] = React.useState("PA");
  const [city, setCity] = React.useState("Philadelphia");
  const [search, setSearch] = React.useState("coffee");

  const { run, result, error, isRunning } = usePerformanceRun();
  const { indexes } = useBusinessIndexes();

  const scenario = SCENARIO_CATALOG.find((s) => s.id === scenarioId)!;

  const onRun = () => {
    void run(scenarioId, {
      state: scenario.params.includes("state") ? state : undefined,
      city: scenario.params.includes("city") ? city : undefined,
      search: scenario.params.includes("search") ? search : undefined,
    });
  };

  // Run the default scenario once on first mount for an immediate result.
  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    onRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connected =
    error?.code === "DB_UNREACHABLE" ? false : result ? true : null;

  return (
    <AppShell
      title="Query Performance Lab"
      subtitle="See how indexing and query shape affect performance at scale."
      connected={connected}
    >
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Pick a predefined, read-only scenario and run it against the live
          ~150K-business collection. The lab reports MongoDB&apos;s{" "}
          <code className="font-mono">explain()</code> plan — index scan vs.
          collection scan — plus documents examined and timing. Only curated
          scenarios run; no custom queries are accepted.
        </span>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
          <div className="w-full space-y-1.5 lg:w-80">
            <Label>Scenario</Label>
            <Select
              value={scenarioId}
              onValueChange={(v) => setScenarioId(v as ScenarioId)}
            >
              <SelectTrigger aria-label="Choose a scenario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIO_CATALOG.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scenario.params.includes("state") ? (
            <div className="w-full space-y-1.5 sm:w-32">
              <Label htmlFor="perf-state">State</Label>
              <Input
                id="perf-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                maxLength={8}
                placeholder="PA"
              />
            </div>
          ) : null}

          {scenario.params.includes("city") ? (
            <div className="w-full space-y-1.5 sm:w-48">
              <Label htmlFor="perf-city">City</Label>
              <Input
                id="perf-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={80}
                placeholder="Philadelphia"
              />
            </div>
          ) : null}

          {scenario.params.includes("search") ? (
            <div className="w-full space-y-1.5 sm:w-48">
              <Label htmlFor="perf-search">Name contains</Label>
              <Input
                id="perf-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={60}
                placeholder="coffee"
              />
            </div>
          ) : null}

          <Button onClick={onRun} disabled={isRunning} className="lg:ml-auto">
            <Play className={cn("h-4 w-4", isRunning && "animate-pulse")} />
            {isRunning ? "Running…" : "Run scenario"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{scenario.description}</p>

      {error && !result ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">
            {error.message}
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <div className={cn(isRunning && "opacity-60 transition-opacity")}>
          <ResultPanel result={result} />
        </div>
      ) : null}

      <IndexesPanel data={indexes} />
    </AppShell>
  );
}
