"use client";

import { RotateCcw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CityCombobox } from "@/components/businesses/city-combobox";
import type { ExplorerState } from "@/lib/businesses/filter-state";
import { MIN_RATINGS } from "@/lib/businesses/schema";
import type { FilterOptions } from "@/lib/businesses/types";

const RATING_LABELS: Record<number, string> = {
  0: "Any rating",
  2: "2.0 & up",
  3: "3.0 & up",
  4: "4.0 & up",
  4.5: "4.5 & up",
};

export function FiltersPanel({
  state,
  options,
  activeFilterCount,
  onChange,
  onReset,
}: {
  state: ExplorerState;
  options: FilterOptions | null;
  activeFilterCount: number;
  onChange: (patch: Partial<ExplorerState>) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">Filters</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={activeFilterCount === 0}
          className="h-7 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      {/* Search */}
      <div className="space-y-1.5">
        <Label htmlFor="business-search">Search by name</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="business-search"
            value={state.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="e.g. Coffee, Pizza, Smith's…"
            className="pl-8 pr-8"
            maxLength={100}
            autoComplete="off"
          />
          {state.search ? (
            <button
              type="button"
              onClick={() => onChange({ search: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {/* State */}
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select
            value={state.state || "__any"}
            onValueChange={(v) =>
              onChange({ state: v === "__any" ? "" : v, city: "" })
            }
          >
            <SelectTrigger aria-label="Filter by state">
              <SelectValue placeholder="Any state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any state</SelectItem>
              {(options?.states ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label>City</Label>
          <CityCombobox
            value={state.city}
            stateFilter={state.state}
            options={options?.cities ?? []}
            onChange={(city) => onChange({ city })}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={state.category || "__any"}
            onValueChange={(v) =>
              onChange({ category: v === "__any" ? "" : v })
            }
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="Any category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any category</SelectItem>
              {(options?.categories ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Min rating */}
        <div className="space-y-1.5">
          <Label>Minimum rating</Label>
          <Select
            value={String(state.minRating)}
            onValueChange={(v) =>
              onChange({
                minRating: Number(v) as ExplorerState["minRating"],
              })
            }
          >
            <SelectTrigger aria-label="Minimum rating">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MIN_RATINGS.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {RATING_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={state.status}
            onValueChange={(v) =>
              onChange({ status: v as ExplorerState["status"] })
            }
          >
            <SelectTrigger aria-label="Business status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
