import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Accessible star rating. Renders five star outlines with a clipped overlay of
 * filled stars representing the fractional value, plus the numeric value for
 * clarity and screen readers. Returns a dash when the rating is unknown.
 */
export function RatingStars({
  value,
  className,
  showNumber = true,
}: {
  value: number | null;
  className?: string;
  showNumber?: boolean;
}) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      <span className="relative inline-flex" aria-hidden="true">
        <span className="flex text-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5" fill="currentColor" />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-brand-amber"
          style={{ width: `${pct}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 shrink-0" fill="currentColor" />
          ))}
        </span>
      </span>
      {showNumber ? (
        <span className="text-sm font-medium tabular-nums text-foreground">
          {clamped.toFixed(1)}
        </span>
      ) : null}
    </span>
  );
}
