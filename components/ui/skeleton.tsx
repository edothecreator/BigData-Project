import { cn } from "@/lib/utils";

/**
 * A visual-only placeholder used while real data loads. It intentionally shows
 * no values — never fake data — and preserves the final layout's dimensions.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
