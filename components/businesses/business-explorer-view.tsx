"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/dashboard/error-state";
import { FiltersPanel } from "@/components/businesses/filters-panel";
import { ResultsTable } from "@/components/businesses/results-table";
import { SummaryMetrics } from "@/components/businesses/summary-metrics";
import { BusinessDetailSheet } from "@/components/businesses/business-detail-sheet";
import { useBusinessExplorer } from "@/hooks/use-business-explorer";
import { useFilterOptions } from "@/hooks/use-filter-options";
import type { BusinessListItem } from "@/lib/businesses/types";
import { cn } from "@/lib/utils";

export function BusinessExplorerView() {
  const explorer = useBusinessExplorer();
  const { options } = useFilterOptions();

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const openDetail = React.useCallback((item: BusinessListItem) => {
    setDetailId(item.businessId);
    setDetailOpen(true);
  }, []);

  const connected = explorer.isError
    ? false
    : explorer.data
      ? true
      : null;

  const summary = explorer.data?.summary ?? {
    total: 0,
    averageRating: null,
    openCount: 0,
    openRatio: 0,
  };

  const headerActions = (
    <Button
      variant="outline"
      size="sm"
      onClick={explorer.reset}
      disabled={explorer.activeFilterCount === 0}
      aria-label="Reset all filters"
    >
      <RefreshCw className="h-4 w-4" />
      <span className="hidden sm:inline">Reset</span>
    </Button>
  );

  return (
    <AppShell
      title="Business Explorer"
      subtitle="Search and analyze businesses across the Yelp dataset."
      connected={connected}
      headerActions={headerActions}
    >
      {explorer.isError && explorer.error && !explorer.data ? (
        <ErrorState
          error={explorer.error}
          onRetry={() => explorer.update({})}
          isRetrying={explorer.isFetching}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Filters column */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <FiltersPanel
              state={explorer.state}
              options={options}
              activeFilterCount={explorer.activeFilterCount}
              onChange={(patch) => explorer.update(patch)}
              onReset={explorer.reset}
            />
          </div>

          {/* Results column */}
          <div className="min-w-0 space-y-5">
            <SummaryMetrics
              summary={summary}
              isFetching={explorer.isLoading}
            />

            {explorer.isError && explorer.error ? (
              <div
                className={cn(
                  "rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
                )}
                role="alert"
              >
                {explorer.error.message}
              </div>
            ) : null}

            <ResultsTable
              data={explorer.data}
              isLoading={explorer.isLoading}
              isFetching={explorer.isFetching}
              onSort={explorer.toggleSort}
              onPage={explorer.setPage}
              onPageSize={(size) =>
                explorer.update({
                  pageSize: size as typeof explorer.state.pageSize,
                })
              }
              onOpenDetail={openDetail}
            />
          </div>
        </div>
      )}

      <BusinessDetailSheet
        businessId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </AppShell>
  );
}
