"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartCard, ChartCardSkeleton, ChartEmptyState } from "@/components/dashboard/chart-card";
import { ErrorState } from "@/components/dashboard/error-state";
import { QuickInsights } from "@/components/dashboard/quick-insights";
import { MarketTable } from "@/components/insights/market-table";
import { MarketChart } from "@/components/insights/market-chart";
import { useInsightsData } from "@/hooks/use-insights-data";
import { cn } from "@/lib/utils";

function LoadingSkeleton() {
  return <div role="status" aria-label="Loading Market Insights" className="space-y-6">
    <ChartCardSkeleton height={48} />
    <div className="grid gap-4 xl:grid-cols-2"><ChartCardSkeleton height={520} /><ChartCardSkeleton height={520} /></div>
    <div className="grid gap-4 xl:grid-cols-2"><ChartCardSkeleton height={620} /><ChartCardSkeleton height={340} /></div>
    <ChartCardSkeleton height={120} />
  </div>;
}

export function InsightsView() {
  const [category, setCategory] = React.useState("");
  const [state, setState] = React.useState("");
  const { data, error, loading, refresh } = useInsightsData(category, state);
  // Keep bounded dropdown options during loads/errors so filters remain usable.
  const options = React.useRef<{ categories: string[]; states: string[] }>({ categories: [], states: [] });
  React.useEffect(() => {
    if (data) options.current = { categories: data.categoryOptions, states: data.states.map((row) => row.state) };
  }, [data]);
  const categoryOptions = data?.categoryOptions ?? options.current.categories;
  const stateOptions = data?.states.map((row) => row.state) ?? options.current.states;
  const chosenCategory = category || data?.selectedCategory || "";

  return (
    <AppShell title="Market Insights" subtitle="Category and geographic patterns across the local business market."
      connected={error ? false : data ? true : null}
      headerActions={<>
        <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
          {data ? `Updated ${new Date(data.generatedAt).toLocaleTimeString("en-US")}` : loading ? "Loading insights…" : "Not yet refreshed"}
        </span>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} aria-label="Refresh Market Insights">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /><span className="hidden sm:inline">Refresh</span>
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="w-full space-y-1.5 sm:w-48">
          <label htmlFor="insights-state" className="label-eyebrow">Geographic scope</label>
          <Select value={state || "all"} onValueChange={(value) => setState(value === "all" ? "" : value)}>
            <SelectTrigger id="insights-state"><SelectValue placeholder="All states" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All states</SelectItem>{stateOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1.5 sm:w-72">
          <label htmlFor="insights-category" className="label-eyebrow">Category cross-analysis</label>
          <Select value={chosenCategory} onValueChange={setCategory} disabled={!categoryOptions.length}>
            <SelectTrigger id="insights-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>{categoryOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground sm:pb-2">State filters city comparisons. Category filters the category × geography panel.</p>
      </div>

      {error ? <ErrorState error={error} onRetry={refresh} isRetrying={loading} /> : loading ? <LoadingSkeleton /> : data ? <>
        {!data.businessesAvailable ? <ChartEmptyState message="Businesses not imported. Import the businesses collection to view Market Insights." /> : <>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <Badge variant="mint">Variety</Badge>
            <p className="text-xs leading-relaxed text-muted-foreground">Comma-separated categories are split, trimmed, and grouped into structured market segments. Businesses can belong to multiple categories, so category totals overlap. Ratings average business ratings; open rates exclude unknown statuses. Counts describe this dataset, not population-adjusted market density.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Category Market Landscape" description="Top 12 categories by business count, across all states.">
              <MarketTable label="Category" rows={data.categories.map((row) => ({ ...row, label: row.category }))} />
            </ChartCard>
            <ChartCard title="Geographic Breakdown" description="Top 12 states by business count. Choose a state above to explore its cities.">
              <MarketChart rows={data.states.slice(0, 12)} />
              <MarketTable label="State" rows={data.states.slice(0, 12)} />
            </ChartCard>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title={state ? `Top Cities in ${state}` : "Top Cities Across All States"} description="Top 12 cities, grouped by city and state together.">
              <MarketTable label="City, state" rows={data.cities} />
            </ChartCard>
            <ChartCard title="Review Engagement by Category" description="Top 12 by average businesses.review_count; minimum 20 businesses per category. No scan of the reviews collection.">
              <MarketChart metric="averageReviews" rows={data.engagement.map((row) => ({ ...row, label: row.category }))} />
              <p className="mt-3 text-xs text-muted-foreground">Hover or focus a bar for its full category name and average review count.</p>
            </ChartCard>
          </div>
          <ChartCard title={data.selectedCategory ? `${data.selectedCategory} × Geography` : "Category × Geography"}
            description={`Top cities by business count for the exact selected category${state ? ` in ${state}` : " across all states"}. Category matching uses whole trimmed names.`}>
            <div className="grid gap-6 xl:grid-cols-2">
              <MarketChart rows={data.categoryMarkets} />
              <MarketTable label="City, state" rows={data.categoryMarkets} />
            </div>
          </ChartCard>
          <QuickInsights insights={data.insights} />
        </>}
      </> : null}
    </AppShell>
  );
}
