"use client";

import {
  Building2,
  MessagesSquare,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CollectionStat, DashboardData } from "@/lib/dashboard/types";
import { cn, formatCompact, formatFull } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  accent: string;
  value: string;
  secondary: string;
  /** Full-precision value shown in a tooltip, when meaningful. */
  tooltip?: string;
  /** When true the metric is unavailable (collection not imported). */
  unavailable?: boolean;
}

function KpiCard({
  label,
  icon: Icon,
  accent,
  value,
  secondary,
  tooltip,
  unavailable,
}: KpiCardProps) {
  const body = (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="label-eyebrow">{label}</p>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: `hsl(var(${accent}) / 0.12)` }}
          >
            <Icon
              className="h-4 w-4"
              style={{ color: `hsl(var(${accent}))` }}
              aria-hidden="true"
            />
          </span>
        </div>
        <p
          className={cn(
            "mt-4 text-3xl font-semibold tracking-tight tabular-nums",
            unavailable && "text-muted-foreground",
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>
      </CardContent>
    </Card>
  );

  if (!tooltip) return body;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-default">{body}</div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function findStat(
  data: DashboardData,
  key: CollectionStat["key"],
): CollectionStat | undefined {
  return data.collections.find((c) => c.key === key);
}

export function KpiCards({ data }: { data: DashboardData }) {
  const businesses = findStat(data, "businesses");
  const reviews = findStat(data, "reviews");
  const users = findStat(data, "users");

  const countCard = (
    stat: CollectionStat | undefined,
    label: string,
    icon: LucideIcon,
    accent: string,
  ): KpiCardProps => {
    if (!stat?.available || stat.count === null) {
      return {
        label,
        icon,
        accent,
        value: "Not imported",
        secondary: "Collection not found in database",
        unavailable: true,
      };
    }
    return {
      label,
      icon,
      accent,
      value: formatCompact(stat.count),
      secondary: `${formatFull(stat.count)} documents (estimated)`,
      tooltip: `${formatFull(stat.count)} documents · estimated count`,
    };
  };

  const cards: KpiCardProps[] = [
    countCard(businesses, "Total Businesses", Building2, "--brand-indigo"),
    countCard(reviews, "Total Reviews", MessagesSquare, "--brand-mint"),
    countCard(users, "Total Users", Users, "--brand-amber"),
    data.averageRating !== null
      ? {
          label: "Avg Business Rating",
          icon: Star,
          accent: "--brand-coral",
          value: data.averageRating.toFixed(1),
          secondary: "Mean of businesses.stars (1.0–5.0)",
          tooltip: `Exact mean: ${data.averageRating.toFixed(4)} stars`,
        }
      : {
          label: "Avg Business Rating",
          icon: Star,
          accent: "--brand-coral",
          value: "Not imported",
          secondary: "Businesses collection unavailable",
          unavailable: true,
        },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-9 rounded-[10px]" />
            </div>
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
