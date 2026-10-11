"use client";

import * as React from "react";
import { Clock, MapPin, MessageSquare, Navigation, Tag } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/businesses/rating-stars";
import { StatusBadge } from "@/components/businesses/status-badge";
import type {
  BusinessApiError,
  BusinessDetail,
} from "@/lib/businesses/types";
import { formatFull } from "@/lib/utils";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function BusinessDetailSheet({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = React.useState<BusinessDetail | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !businessId) return;
    let cancelled = false;
    setStatus("loading");
    setDetail(null);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/businesses/${encodeURIComponent(businessId)}`,
          { cache: "no-store" },
        );
        const body = (await res.json()) as BusinessDetail | BusinessApiError;
        if (cancelled) return;
        if (!res.ok || "error" in body) {
          setError(
            "error" in body ? body.message : "Failed to load business.",
          );
          setStatus("error");
        } else {
          setDetail(body);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach the server.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, businessId]);

  const hasAddress =
    detail && (detail.address || detail.city || detail.state || detail.postalCode);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {status === "loading" ? (
          <>
            <SheetHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-32" />
            </SheetHeader>
            <div className="space-y-6 p-5">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </>
        ) : status === "error" ? (
          <>
            <SheetHeader>
              <SheetTitle>Unable to load</SheetTitle>
              <SheetDescription>{error}</SheetDescription>
            </SheetHeader>
          </>
        ) : detail ? (
          <>
            <SheetHeader>
              <SheetTitle>{detail.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-3 pt-1">
                <RatingStars value={detail.stars} />
                <StatusBadge status={detail.status} />
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {formatFull(detail.reviewCount)} reviews
              </div>

              {hasAddress ? (
                <Section icon={MapPin} title="Location">
                  <address className="not-italic text-sm leading-relaxed text-foreground">
                    {detail.address ? <div>{detail.address}</div> : null}
                    <div>
                      {[detail.city, detail.state].filter(Boolean).join(", ")}
                      {detail.postalCode ? ` ${detail.postalCode}` : ""}
                    </div>
                  </address>
                  {detail.latitude !== null && detail.longitude !== null ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      {detail.latitude.toFixed(5)}, {detail.longitude.toFixed(5)}
                    </p>
                  ) : null}
                </Section>
              ) : null}

              {detail.categories.length > 0 ? (
                <Section icon={Tag} title="Categories">
                  <div className="flex flex-wrap gap-1.5">
                    {detail.categories.map((c) => (
                      <Badge key={c} variant="secondary">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </Section>
              ) : null}

              {detail.hours.length > 0 ? (
                <Section icon={Clock} title="Hours">
                  <dl className="divide-y divide-border rounded-lg border border-border">
                    {detail.hours.map((h) => (
                      <div
                        key={h.day}
                        className="flex items-center justify-between px-3 py-1.5 text-sm"
                      >
                        <dt className="text-muted-foreground">{h.day}</dt>
                        <dd className="font-medium tabular-nums">{h.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              ) : null}

              {detail.attributes.length > 0 ? (
                <Section icon={Tag} title="Attributes">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {detail.attributes.map((a) => (
                      <div
                        key={a.key}
                        className="flex items-baseline justify-between gap-2 text-sm"
                      >
                        <dt className="text-muted-foreground">{a.label}</dt>
                        <dd className="text-right font-medium">{a.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              ) : null}

              {!hasAddress &&
              detail.categories.length === 0 &&
              detail.hours.length === 0 &&
              detail.attributes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No additional details are recorded for this business.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
