"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { SidebarContent } from "@/components/layout/sidebar";

/**
 * Application shell shared by every page: fixed sidebar on desktop, a slide-in
 * drawer on mobile, the page header, a scrollable main region, and the footer.
 *
 * `connected` reflects the verified DB status (null = unknown). Pages pass
 * their own title/subtitle and optional header actions.
 */
export function AppShell({
  title,
  subtitle,
  headerActions,
  connected,
  children,
  contentMaxWidth = "max-w-[1400px]",
}: {
  title: string;
  subtitle: string;
  headerActions?: React.ReactNode;
  connected: boolean | null;
  children: React.ReactNode;
  contentMaxWidth?: string;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-[248px] shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent connected={connected === true} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-[248px] border-r border-sidebar-border shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-3 z-10"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </Button>
            <SidebarContent
              connected={connected === true}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={title}
          subtitle={subtitle}
          actions={headerActions}
          onOpenNav={() => setMobileOpen(true)}
        />

        <main
          className={`mx-auto w-full flex-1 space-y-6 p-4 md:p-6 ${contentMaxWidth}`}
        >
          {children}
        </main>

        <footer className="border-t border-border px-4 py-4 md:px-6">
          <p className={`mx-auto text-xs text-muted-foreground ${contentMaxWidth}`}>
            ReviewScope · Aggregate analytics over the Yelp Open Dataset
            (academic use). Independent project — not affiliated with or
            endorsed by Yelp. Data served locally from{" "}
            <code className="font-mono">yelp_analytics</code>.
          </p>
        </footer>
      </div>
    </div>
  );
}
