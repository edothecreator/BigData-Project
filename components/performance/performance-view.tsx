"use client";

import * as React from "react";
import { Info, Play } from "lucide-react";
import { toast } from "sonner";

import { CityCombobox } from "@/components/businesses/city-combobox";
import { ErrorState } from "@/components/dashboard/error-state";
import { AppShell } from "@/components/layout/app-shell";
import { IndexesPanel } from "@/components/performance/indexes-panel";
import {
  ResultPanel,
  ResultPanelSkeleton,
} from "@/components/performance/result-panel";
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
import { useFilterOptions } from "@/hooks/use-filter-options";
import { useBusinessIndexes, usePerformanceRun } from "@/hooks/use-performance";
import {
  getScenarioInfo,
  SCENARIO_CATALOG,
  type ManagedIndexId,
  type ScenarioId,
} from "@/lib/performance/catalog";
import { explainResult } from "@/lib/performance/explain-text";
import {
  MAX_CITY_LENGTH,
  MAX_SEARCH_LENGTH,
  MAX_STATE_LENGTH,
} from "@/lib/performance/schema";
import { cn } from "@/lib/utils";

export function PerformanceView() {
  const [scenarioId, setScenarioId] = React.useState<ScenarioId>("state-city");
  const [state, setState] = React.useState("PA");
  const [city, setCity] = React.useState("Philadelphia");
  const [search, setSearch] = React.useState("coffee");

  const { run, result, error, isRunning } = usePerformanceRun();
  const indexes = useBusinessIndexes();
  const { options } = useFilterOptions();

  const scenario = getScenarioInfo(scenarioId);
  const needs = (p: "state" | "city" | "search") => scenario.params.includes(p);
  const missingCity = needs("city") && city.trim() === "";
  const missingSearch = needs("search") && search.trim() === "";
  const canRun = !isRunning && !missingCity && !missingSearch;

  const runCurrent = React.useCallback(() => {
    const info = getScenarioInfo(scenarioId);
    void run(scenarioId, {
      state: info.params.includes("state") ? state : undefined,
      city: info.params.includes("city") ? city : undefined,
      search: info.params.includes("search") ? search : undefined,
    });
  }, [run, scenarioId, state, city, search]);

  // Run the default scenario once on mount for an immediate result.
  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    runCurrent();
  }, [runCurrent]);

  // Surface non-connection failures (e.g. 400 validation) as a toast; keep
  // the previous result on screen instead of blanking it.
  React.useEffect(() => {
    if (error && error.code !== "DB_UNREACHABLE") {
      toast.error("Scenario failed", { description: error.message });
    }
  }, [error]);

  const onEnsure = async (id: ManagedIndexId) => {
    const res = await indexes.ensure(id);
    if (!res.ok) {
      toast.error("Could not create index", { description: res.error.message });
      return;
    }
    if (res.data.created) {
      toast.success(`Created ${id}`, {
        description: `Built in ${res.data.buildMs} ms. Re-running the scenario…`,
      });
    } else {
      toast.info(`${id} already exists`, { description: "Nothing to do." });
    }
    if (result && getScenarioInfo(result.scenarioId).expectedIndex === id) {
      runCurrent();
    }
  };

  const resultInfo = result ? getScenarioInfo(result.scenarioId) : null;
  const expectedPresent =
    resultInfo?.expectedIndex && indexes.data
      ? (indexes.data.managed.find((m) => m.id === resultInfo.expectedIndex)
          ?.present ?? null)
      : null;
  const explanation =
    result && resultInfo
      ? explainResult(result, resultInfo.expectedIndex, expectedPresent)
      : null;

  const dbDown = error?.code === "DB_UNREACHABLE";
  const connected = dbDown ? false : result ? true : null;

  return (
    <AppShell
      title="Query Performance Lab"
      subtitle="See how indexing and query shape affect performance at scale."
      connected={connected}
    >
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Pick a predefined, read-only scenario and run it against the live
          ~150K-document <code className="font-mono">businesses</code>{" "}
          collection. Each run reports MongoDB&apos;s{" "}
          <code className="font-mono">explain(&quot;executionStats&quot;)</code>{" "}
          for the planner&apos;s choice and for the same query forced to a
          collection scan with{" "}
          <code className="font-mono">hint({"{ $natural: 1 }"})</code> — the
          &quot;without index&quot; baseline, no index dropped. Only curated
          scenarios run; custom queries are not accepted.
        </span>
      </div>

      {/* Scenario picker */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="w-full space-y-1.5 lg:w-72">
            <Label htmlFor="perf-scenario">Scenario</Label>
            <Select
              value={scenarioId}
              onValueChange={(v) => setScenarioId(v as ScenarioId)}
            >
              <SelectTrigger id="perf-scenario" aria-label="Choose a scenario">
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

          {needs("state") ? (
            <div className="w-full space-y-1.5 sm:w-32">
              <Label htmlFor="perf-state">State</Label>
              {options?.states.length ? (
                <Select
                  value={state}
                  onValueChange={(v) => {
                    setState(v);
                    if (v !== state) setCity("");
                  }}
                >
                  <SelectTrigger id="perf-state" aria-label="Choose a state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.states.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="perf-state"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  maxLength={MAX_STATE_LENGTH}
                  placeholder="PA"
                />
              )}
            </div>
          ) : null}

          {needs("city") ? (
            <div className="w-full space-y-1.5 sm:w-56">
              <Label>City</Label>
              {options ? (
                <CityCombobox
                  value={city}
                  stateFilter={state}
                  options={options.cities}
                  onChange={setCity}
                />
              ) : (
                <Input
                  aria-label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={MAX_CITY_LENGTH}
                  placeholder="Philadelphia"
                />
              )}
            </div>
          ) : null}

          {needs("search") ? (
            <div className="w-full space-y-1.5 sm:w-56">
              <Label htmlFor="perf-search">Name contains</Label>
              <Input
                id="perf-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canRun) runCurrent();
                }}
                maxLength={MAX_SEARCH_LENGTH}
                placeholder="coffee"
              />
            </div>
          ) : null}

          <Button onClick={runCurrent} disabled={!canRun} className="lg:ml-auto">
            <Play className={cn(isRunning && "animate-pulse")} />
            {isRunning ? "Running…" : "Run scenario"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {scenario.description}
        {scenario.expectedIndex ? (
          <>
            {" "}
            Expected index:{" "}
            <code className="font-mono">{scenario.expectedIndex}</code>.
          </>
        ) : null}
        {missingCity ? " Choose a city to run this scenario." : null}
        {missingSearch ? " Enter a search term to run this scenario." : null}
      </p>

      {dbDown && error ? (
        <ErrorState error={error} onRetry={runCurrent} isRetrying={isRunning} />
      ) : result && explanation ? (
        <div
          className={cn(isRunning && "opacity-60 transition-opacity")}
          aria-busy={isRunning}
        >
          <ResultPanel result={result} explanation={explanation} />
        </div>
      ) : isRunning ? (
        <ResultPanelSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={runCurrent} isRetrying={isRunning} />
      ) : null}

      <IndexesPanel
        data={indexes.data}
        error={indexes.error}
        isLoading={indexes.isLoading}
        pending={indexes.pending}
        onRefresh={() => void indexes.refresh()}
        onEnsure={(id) => void onEnsure(id)}
      />
    </AppShell>
  );
}
