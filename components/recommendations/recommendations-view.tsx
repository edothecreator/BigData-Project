"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, Layers, Sparkles, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/dashboard/error-state";
import { RatingStars } from "@/components/businesses/rating-stars";
import { SeedPicker } from "@/components/recommendations/seed-picker";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { useRecommendations } from "@/hooks/use-recommendations";
import type {
  RecommendationStrategy,
  SeedOption,
} from "@/lib/recommendations/types";
import { cn } from "@/lib/utils";

const STRATEGIES: {
  id: RecommendationStrategy;
  label: string;
  icon: typeof Layers;
  blurb: string;
}[] = [
  {
    id: "content",
    label: "Similar businesses",
    icon: Layers,
    blurb: "Content-based: ranked by shared categories, location, and rating.",
  },
  {
    id: "collaborative",
    label: "People also reviewed",
    icon: Users,
    blurb:
      "Collaborative: businesses commonly reviewed by the same people as the seed.",
  },
];

function seedLabel(name: string, city: string, state: string): string {
  const loc = [city, state].filter(Boolean).join(", ");
  return loc ? `${name} — ${loc}` : name;
}

export function RecommendationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [seed, setSeed] = React.useState<SeedOption | null>(null);
  const [strategy, setStrategy] =
    React.useState<RecommendationStrategy>("content");

  // Initialize seed id from the URL (shareable links).
  const initialId = searchParams.get("businessId");

  const businessId = seed?.businessId ?? initialId;
  const { data, isLoading, isError, error } = useRecommendations(
    businessId,
    strategy,
  );

  // Keep URL in sync with the chosen seed.
  React.useEffect(() => {
    if (!seed) return;
    const qs = new URLSearchParams();
    qs.set("businessId", seed.businessId);
    router.replace(`/recommendations?${qs.toString()}`, { scroll: false });
  }, [seed, router]);

  const connected = isError ? false : data ? true : null;

  // Prefer the live seed selection label; else the resolved seed from the API.
  const selectedLabel = seed
    ? seedLabel(seed.name, seed.city, seed.state)
    : data
      ? seedLabel(data.seed.name, data.seed.city, data.seed.state)
      : null;

  return (
    <AppShell
      title="Recommendations"
      subtitle="Discover businesses similar to one you choose."
      connected={connected}
    >
      {/* Controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <p className="label-eyebrow">Seed business</p>
            <SeedPicker
              selectedLabel={selectedLabel}
              onSelect={(s) => setSeed(s)}
            />
          </div>

          <div className="space-y-1.5">
            <p className="label-eyebrow">Strategy</p>
            <div
              className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
              role="tablist"
              aria-label="Recommendation strategy"
            >
              {STRATEGIES.map((s) => {
                const Icon = s.icon;
                const active = strategy === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStrategy(s.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {STRATEGIES.find((s) => s.id === strategy)?.blurb}
      </p>

      {/* Body */}
      {!businessId ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Pick a business to start</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Choose a seed business above and we&apos;ll surface the ones most
                like it, computed live from the dataset.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isError && error ? (
        <ErrorState
          error={error}
          onRetry={() => setStrategy((s) => s)}
          isRetrying={isLoading}
        />
      ) : (
        <div className="space-y-4">
          {/* Seed summary */}
          {data ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" /> Seed
              </Badge>
              <span className="font-medium">{data.seed.name}</span>
              <RatingStars value={data.seed.stars} />
              <span className="text-xs text-muted-foreground">
                {[data.seed.city, data.seed.state].filter(Boolean).join(", ")}
              </span>
            </div>
          ) : null}

          {/* Fallback notice */}
          {data?.fallbackReason ? (
            <div
              className="flex items-start gap-2 rounded-lg border border-brand-amber/30 bg-brand-amber/10 px-4 py-3 text-sm text-foreground"
              role="status"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber" />
              <span>{data.fallbackReason}</span>
            </div>
          ) : null}

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-6 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((item) => (
                <RecommendationCard
                  key={item.businessId}
                  item={item}
                  onSelect={(it) =>
                    setSeed({
                      businessId: it.businessId,
                      name: it.name,
                      city: it.city,
                      state: it.state,
                      stars: it.stars,
                      reviewCount: it.reviewCount,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-14 text-center text-sm text-muted-foreground">
                No recommendations available for this business.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
