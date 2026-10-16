"use client";

import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/businesses/rating-stars";
import { StatusBadge } from "@/components/businesses/status-badge";
import type { RecommendedBusiness } from "@/lib/recommendations/types";
import { formatFull } from "@/lib/utils";

export function RecommendationCard({
  item,
  onSelect,
}: {
  item: RecommendedBusiness;
  onSelect?: (item: RecommendedBusiness) => void;
}) {
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect?.(item)}
              className="text-left text-sm font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {item.name}
            </button>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[item.city, item.state].filter(Boolean).join(", ") || "—"}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <RatingStars value={item.stars} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatFull(item.reviewCount)} reviews
          </span>
        </div>

        {item.categories.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.categories.slice(0, 3).map((c) => (
              <Badge key={c} variant="secondary" className="max-w-[9rem] truncate">
                {c}
              </Badge>
            ))}
            {item.categories.length > 3 ? (
              <Badge variant="muted">+{item.categories.length - 3}</Badge>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <Badge variant="default" className="gap-1">
            {item.reason}
          </Badge>
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              aria-label={`Use ${item.name} as the new seed`}
            >
              Explore <ArrowRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
