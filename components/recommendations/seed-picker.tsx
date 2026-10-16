"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSeedSearch } from "@/hooks/use-seed-search";
import { cn, formatFull } from "@/lib/utils";
import type { SeedOption } from "@/lib/recommendations/types";

/**
 * Searchable business picker that chooses the recommendation "seed". Queries the
 * server (debounced) — never loads all businesses into the browser.
 */
export function SeedPicker({
  selectedLabel,
  onSelect,
}: {
  selectedLabel: string | null;
  onSelect: (seed: SeedOption) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { options, loading } = useSeedSearch(query);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal sm:w-[22rem]"
        >
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel ?? "Choose a business…"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
      >
        <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search businesses by name…"
            className="h-7 border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            maxLength={100}
          />
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {options.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {loading ? "Searching…" : "No businesses found."}
            </p>
          ) : (
            options.map((o) => (
              <button
                key={o.businessId}
                type="button"
                onClick={() => {
                  onSelect(o);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{o.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[o.city, o.state].filter(Boolean).join(", ")} ·{" "}
                    {formatFull(o.reviewCount)} reviews
                  </span>
                </span>
                {selectedLabel && selectedLabel.startsWith(o.name) ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
