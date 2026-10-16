"use client";

import { CalendarRange, MessagesSquare, RefreshCw, Star, ThumbsUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/dashboard/error-state";
import { ChartCard, ChartCardSkeleton, ChartEmptyState } from "@/components/dashboard/chart-card";
import { KpiCardsSkeleton } from "@/components/dashboard/kpi-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewCharts } from "@/components/reviews/review-charts";
import { useReviewsData } from "@/hooks/use-reviews-data";
import { cn, formatCompact, formatFull } from "@/lib/utils";
import type { ReviewAnalytics } from "@/lib/reviews/types";

function SummaryCards({ data }: { data: ReviewAnalytics }) {
  const cards = [
    { label: "Total Reviews", value: data.available ? formatCompact(data.totalReviews ?? 0) : "Not imported", detail: data.available ? `${formatFull(data.totalReviews ?? 0)} documents (estimated)` : "Reviews collection not found", icon: MessagesSquare },
    { label: "Average Review Rating", value: data.averageReviewRating?.toFixed(2) ?? "—", detail: "Mean of reviews.stars · 1–5 stars", icon: Star },
    { label: 'Total “useful” Votes', value: data.available ? formatCompact(data.usefulVotes) : "—", detail: data.available ? `${formatFull(data.usefulVotes)} votes across reviews` : "Reviews collection not found", icon: ThumbsUp },
    { label: "Review Date Span", value: data.dateSpan ? `${data.dateSpan.earliest}–${data.dateSpan.latest}` : "—", detail: "Earliest to latest review year", icon: CalendarRange },
  ];
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon }) => (
    <Card key={label}><CardContent className="p-5">
      <div className="flex items-start justify-between gap-2"><p className="label-eyebrow">{label}</p><Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /></div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </CardContent></Card>
  ))}</div>;
}

export function ReviewExplorerView() {
  const { data, error, isFetching, refresh } = useReviewsData();
  return (
    <AppShell title="Review Explorer" subtitle="Analyze review activity across the Yelp dataset."
      connected={error ? error.code === "DB_UNREACHABLE" ? false : null : data ? true : null}
      headerActions={<Button variant="outline" size="sm" onClick={refresh} disabled={isFetching} aria-label="Refresh review analytics"><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /><span className="hidden sm:inline">Refresh</span></Button>}>
      {error ? <div role="alert"><ErrorState error={error} onRetry={refresh} isRetrying={isFetching} /></div> : null}
      {data ? <div className={cn("space-y-6", isFetching && "opacity-60")} aria-busy={isFetching}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <Badge variant="muted">Volume · Aggregate analytics</Badge>
          <span>{error ? "Last successful result · " : "Updated · "}{new Date(data.generatedAt).toLocaleString()}</span>
        </div>
        <SummaryCards data={data} />
        {!data.available ? <ChartEmptyState message="Reviews have not been imported into this database." /> : data.totalReviews === 0 ? <ChartEmptyState message="The reviews collection is empty." /> : null}
        <ReviewCharts data={data} />
        <ChartCard title="Top Reviewed Businesses" description="Top 15 by actual review count, with business metadata joined after ranking.">
          {data.topBusinesses.length ? <Table>
            <caption className="sr-only">Businesses ranked by review volume</caption>
            <TableHeader><TableRow><TableHead scope="col">Business</TableHead><TableHead scope="col">City / State</TableHead><TableHead scope="col" className="text-right">Reviews</TableHead></TableRow></TableHeader>
            <TableBody>{data.topBusinesses.map(row => <TableRow key={row.businessId}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{[row.city, row.state].filter(Boolean).join(", ") || "—"}</TableCell><TableCell className="text-right tabular-nums">{formatFull(row.reviewCount)}</TableCell></TableRow>)}</TableBody>
          </Table> : <ChartEmptyState message="No reviewed businesses available." />}
        </ChartCard>
        <p className="text-xs text-muted-foreground">Only aggregate statistics are displayed. Review text and reviewer identities are never returned. Full-dataset calculations may take a moment; refresh runs them again.</p>
      </div> : !error ? <div className="space-y-6" role="status" aria-label="Loading review analytics">
        <span className="sr-only">Calculating review analytics…</span><KpiCardsSkeleton />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><ChartCardSkeleton height={280} /><ChartCardSkeleton height={280} /></div>
        <ChartCardSkeleton height={400} />
      </div> : null}
    </AppShell>
  );
}
