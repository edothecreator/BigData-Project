"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { KpiCards, KpiCardsSkeleton } from "@/components/dashboard/kpi-cards";
import { ChartCardSkeleton } from "@/components/dashboard/chart-card";
import { RatingDistributionChart } from "@/components/dashboard/rating-distribution-chart";
import { TopCategoriesChart } from "@/components/dashboard/top-categories-chart";
import { AvailabilityChart } from "@/components/dashboard/availability-chart";
import { TopCitiesChart } from "@/components/dashboard/top-cities-chart";
import { DatasetFootprint } from "@/components/dashboard/dataset-footprint";
import { QuickInsights } from "@/components/dashboard/quick-insights";
import { ErrorState } from "@/components/dashboard/error-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { cn } from "@/lib/utils";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <KpiCardsSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton height={300} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton height={300} />
      </div>
      <ChartCardSkeleton height={120} />
    </div>
  );
}

function formatTimestamp(date: Date | null): string {
  if (!date) return "Not yet refreshed";
  return `Updated ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

export function DashboardView() {
  const { data, isLoading, isError, error, lastRefreshed, isRefreshing, refresh } =
    useDashboardData();

  // Toast feedback on manual refresh completion.
  const prevRefreshing = React.useRef(false);
  React.useEffect(() => {
    if (prevRefreshing.current && !isRefreshing) {
      if (isError) {
        toast.error("Refresh failed", {
          description: "Could not load fresh dashboard data.",
        });
      } else if (data) {
        toast.success("Dashboard refreshed");
      }
    }
    prevRefreshing.current = isRefreshing;
  }, [isRefreshing, isError, data]);

  const connected = isError ? false : data ? true : null;

  const headerActions = (
    <>
      <span
        className="hidden text-xs text-muted-foreground sm:inline"
        aria-live="polite"
      >
        {formatTimestamp(lastRefreshed)}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={refresh}
        disabled={isRefreshing}
        aria-label="Refresh dashboard data"
      >
        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </>
  );

  return (
    <AppShell
      title="Overview"
      subtitle="A clear picture of the local business landscape."
      connected={connected}
      headerActions={headerActions}
    >
      {isError && error && !data ? (
        <ErrorState error={error} onRetry={refresh} isRetrying={isRefreshing} />
      ) : isLoading && !data ? (
        <LoadingSkeleton />
      ) : data ? (
        <div
          className={cn(
            "space-y-6 transition-opacity",
            isRefreshing && "opacity-60",
          )}
        >
          <KpiCards data={data} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RatingDistributionChart data={data.ratingDistribution} />
            <TopCategoriesChart data={data.topCategories} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AvailabilityChart data={data.availability} />
            <TopCitiesChart data={data.topCities} />
          </div>

          <QuickInsights insights={data.insights} />

          <DatasetFootprint collections={data.collections} />
        </div>
      ) : null}
    </AppShell>
  );
}
