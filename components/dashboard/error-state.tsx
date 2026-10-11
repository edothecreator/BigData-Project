"use client";

import { DatabaseZap, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Minimal error shape shared by the dashboard and Business Explorer error
 * envelopes — both expose a `code` and a human-readable `message`.
 */
interface DisplayableError {
  code: string;
  message: string;
}

export function ErrorState({
  error,
  onRetry,
  isRetrying,
}: {
  error: DisplayableError;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <DatabaseZap className="h-7 w-7 text-destructive" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">
            {error.code === "DB_UNREACHABLE"
              ? "Can't reach the database"
              : "Something went wrong"}
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
        {error.code === "DB_UNREACHABLE" ? (
          <div className="w-full max-w-md rounded-lg border border-border bg-muted/40 p-4 text-left text-xs text-muted-foreground">
            <p className="mb-1.5 font-medium text-foreground">
              Recovery steps
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Confirm MongoDB is running on 127.0.0.1:27017.</li>
              <li>
                Check <code className="font-mono">MONGODB_URI</code> and{" "}
                <code className="font-mono">MONGODB_DB</code> in{" "}
                <code className="font-mono">.env.local</code>.
              </li>
              <li>
                Verify the{" "}
                <code className="font-mono">yelp_analytics</code> database
                exists in Compass.
              </li>
            </ul>
          </div>
        ) : null}
        <Button onClick={onRetry} disabled={isRetrying}>
          <RefreshCw
            className={isRetrying ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
