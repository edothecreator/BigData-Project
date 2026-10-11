"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FilterOptions } from "@/lib/businesses/types";

/**
 * Searchable city selector over a bounded, server-provided list. It never loads
 * all ~1,400 cities as options; it filters the top-N list client-side and also
 * accepts free-text entry (committed on Enter) so uncommon cities remain usable.
 * When a state is selected, cities are scoped to that state.
 */
export function CityCombobox({
  value,
  stateFilter,
  options,
  onChange,
}: {
  value: string;
  stateFilter: string;
  options: FilterOptions["cities"];
  onChange: (city: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const scoped = stateFilter
      ? options.filter((c) => c.state === stateFilter)
      : options;
    const q = query.trim().toLowerCase();
    const matched = q
      ? scoped.filter((c) => c.city.toLowerCase().includes(q))
      : scoped;
    return matched.slice(0, 60);
  }, [options, stateFilter, query]);

  const commit = (city: string) => {
    onChange(city);
    setOpen(false);
    setQuery("");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Any city"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
        align="start"
      >
        <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                e.preventDefault();
                commit(query.trim());
              }
            }}
            placeholder="Search or type a city…"
            className="h-7 border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => commit("")}
            className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <span className="text-muted-foreground">Any city</span>
            {!value ? <Check className="h-4 w-4" /> : null}
          </button>
          {filtered.map((c) => (
            <button
              key={`${c.city}|${c.state}`}
              type="button"
              onClick={() => commit(c.city)}
              className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span className="truncate">
                {c.city}
                <span className="ml-1 text-xs text-muted-foreground">
                  {c.state}
                </span>
              </span>
              {value === c.city ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {c.count.toLocaleString("en-US")}
                </span>
              )}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No cities match. Press Enter to use “{query.trim()}”.
            </p>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
