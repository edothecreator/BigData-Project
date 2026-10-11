import { CircleDot, CircleHelp, CircleSlash } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BusinessStatus } from "@/lib/businesses/types";

/**
 * Open/closed indicator. Uses an icon AND a text label (not color alone) so the
 * status is distinguishable without relying on color perception.
 */
export function StatusBadge({ status }: { status: BusinessStatus }) {
  const config = {
    open: {
      label: "Open",
      icon: CircleDot,
      className: "border-brand-mint/30 bg-brand-mint/10 text-brand-mint",
    },
    closed: {
      label: "Closed",
      icon: CircleSlash,
      className: "border-brand-coral/30 bg-brand-coral/10 text-brand-coral",
    },
    unknown: {
      label: "Unknown",
      icon: CircleHelp,
      className: "border-border bg-muted text-muted-foreground",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
