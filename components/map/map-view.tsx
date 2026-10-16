"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/dashboard/error-state";
import {
  DEFAULT_MAP_FILTERS,
  useMapData,
  type MapFilters,
} from "@/hooks/use-map-data";
import { MAP_LIMITS } from "@/lib/map/schema";
import { cn, formatFull } from "@/lib/utils";

// Leaflet touches `window`, so load the map client-side only (no SSR).
const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), {
  ssr: false,
  loading: () => (
    <Skeleton className="h-[560px] w-full rounded-[var(--radius)]" />
  ),
});

const RATING_LABELS: Record<number, string> = {
  0: "Any rating",
  3: "3.0 & up",
  4: "4.0 & up",
  4.5: "4.5 & up",
};

const STATUS_LEGEND = [
  { key: "open", label: "Open", color: "#20C997" },
  { key: "closed", label: "Closed", color: "#FF7A59" },
  { key: "unknown", label: "Unknown", color: "#778097" },
] as const;

export function MapView() {
  const [filters, setFilters] = React.useState<MapFilters>(DEFAULT_MAP_FILTERS);
  const { data, isLoading, isFetching, isError, error } = useMapData(filters);

  const connected = isError ? false : data ? true : null;

  const patch = (p: Partial<MapFilters>) =>
    setFilters((prev) => ({ ...prev, ...p }));

  return (
    <AppShell
      title="Map Explorer"
      subtitle="See where businesses sit geographically, by real coordinates."
      connected={connected}
    >
      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select
              value={filters.state || "__all"}
              onValueChange={(v) => patch({ state: v === "__all" ? "" : v })}
            >
              <SelectTrigger aria-label="Filter by state">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All states</SelectItem>
                {(data?.states ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => patch({ status: v as MapFilters["status"] })}
            >
              <SelectTrigger aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Minimum rating</Label>
            <Select
              value={String(filters.minRating)}
              onValueChange={(v) => patch({ minRating: Number(v) })}
            >
              <SelectTrigger aria-label="Minimum rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 3, 4, 4.5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {RATING_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Max markers</Label>
            <Select
              value={String(filters.limit)}
              onValueChange={(v) => patch({ limit: Number(v) })}
            >
              <SelectTrigger aria-label="Maximum markers">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAP_LIMITS.map((l) => (
                  <SelectItem key={l} value={String(l)}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Count line */}
      {data ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Showing{" "}
          <span className="font-medium text-foreground">
            {formatFull(data.returned)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">
            {formatFull(data.totalMatching)}
          </span>{" "}
          businesses with coordinates
          {data.state ? ` in ${data.state}` : ""} (most-reviewed first).
        </p>
      ) : null}

      {/* Map */}
      {isError && error && !data ? (
        <ErrorState
          error={error}
          onRetry={() => patch({})}
          isRetrying={isFetching}
        />
      ) : isLoading && !data ? (
        <Skeleton className="h-[560px] w-full rounded-[var(--radius)]" />
      ) : data && data.points.length > 0 ? (
        <div
          className={cn(
            "space-y-2 transition-opacity",
            isFetching && "opacity-60",
          )}
        >
          <div className="overflow-hidden rounded-[var(--radius)] border border-border">
            <LeafletMap points={data.points} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {STATUS_LEGEND.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            ))}
            <span>· clusters group nearby businesses — click to zoom in</span>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-16 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No businesses to plot</p>
            <p className="text-xs text-muted-foreground">
              Try a different state or loosen the filters.
            </p>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
