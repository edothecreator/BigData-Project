import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-xs">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function ChartCardSkeleton({ height = 260 }: { height?: number }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-1.5 h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      </CardContent>
    </Card>
  );
}
