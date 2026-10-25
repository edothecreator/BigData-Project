import { Database, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PlanSummary } from "@/lib/performance/types";
import { cn } from "@/lib/utils";

/** "Index scan (IXSCAN)" vs "Collection scan (COLLSCAN)" verdict pill. */
export function VerdictBadge({
  plan,
  className,
}: {
  plan: PlanSummary;
  className?: string;
}) {
  const Icon = plan.usedIndex ? Zap : Database;
  const label = plan.usedIndex
    ? plan.scanStage === "IXSCAN"
      ? "Index scan (IXSCAN)"
      : `Index scan (${plan.scanStage})`
    : `Collection scan (${plan.scanStage})`;

  return (
    <Badge
      variant={plan.usedIndex ? "mint" : "outline"}
      className={cn(
        "gap-1.5",
        !plan.usedIndex &&
          "border-transparent bg-brand-coral/15 text-brand-coral",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}
