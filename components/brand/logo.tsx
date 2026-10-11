import { Radar } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * ReviewScope brand mark: a radar glyph set in an indigo tile. Custom and
 * minimal — no Yelp logo or official branding, since this is an independent
 * academic analytics tool built on the Yelp Open Dataset.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-sm">
        <Radar className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
      </span>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="text-[0.95rem] font-semibold tracking-tight text-foreground">
            ReviewScope
          </span>
          <span className="mt-0.5 text-[0.6875rem] font-medium text-muted-foreground">
            Local Business Intelligence
          </span>
        </span>
      ) : null}
    </div>
  );
}
