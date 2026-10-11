"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/**
 * Shared page header. Title/subtitle describe the current page; `actions`
 * renders page-specific controls (e.g. a refresh button) before the theme
 * toggle. The mobile nav trigger lives here so it aligns with the title row.
 */
export function Header({
  title,
  subtitle,
  actions,
  onOpenNav,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  onOpenNav?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenNav ? (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenNav}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
