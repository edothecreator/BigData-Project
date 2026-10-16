"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  type LucideIcon,
  MessagesSquare,
  TrendingUp,
  Gauge,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConnectionIndicator } from "@/components/layout/connection-indicator";

interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Route for functional items. Omitted for coming-soon items. */
  href?: string;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", icon: BarChart3, href: "/" },
  { label: "Business Explorer", icon: Building2, href: "/businesses" },
  { label: "Review Explorer", icon: MessagesSquare, href: "/reviews" },
  { label: "Market Insights", icon: TrendingUp, comingSoon: true },
  { label: "Query Performance Lab", icon: Gauge, comingSoon: true },
];

function isActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarContent({
  connected,
  onNavigate,
}: {
  connected: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="label-eyebrow px-2 pb-1 pt-2">Analytics</p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          const classes = cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            active
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground",
            !item.comingSoon &&
              !active &&
              "hover:bg-sidebar-accent hover:text-foreground",
            item.comingSoon && "cursor-not-allowed opacity-70",
          );

          if (item.comingSoon || !item.href) {
            return (
              <button
                key={item.label}
                type="button"
                aria-disabled
                disabled
                className={classes}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">{item.label}</span>
                <Badge variant="muted" className="px-1.5 py-0 text-[0.625rem]">
                  Soon
                </Badge>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={classes}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <ConnectionIndicator connected={connected} />
      </div>
    </div>
  );
}
