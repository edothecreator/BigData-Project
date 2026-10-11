import { Database } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Database connection indicator. It only reports "Connected" once the server
 * has actually returned data (connected === true). Before verification it shows
 * a neutral "Checking" state rather than claiming a connection.
 */
export function ConnectionIndicator({
  connected,
}: {
  connected: boolean | null;
}) {
  const label =
    connected === true
      ? "Database connected"
      : connected === false
        ? "Database unreachable"
        : "Checking connection";

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent px-3 py-2">
      <span className="relative flex h-2.5 w-2.5">
        {connected === true ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-60" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            connected === true && "bg-brand-mint",
            connected === false && "bg-destructive",
            connected === null && "bg-muted-foreground/50",
          )}
        />
      </span>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Database className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
