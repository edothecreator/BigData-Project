import { Suspense } from "react";

import { RecommendationsView } from "@/components/recommendations/recommendations-view";

export const dynamic = "force-dynamic";

export default function RecommendationsPage() {
  // useSearchParams requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <RecommendationsView />
    </Suspense>
  );
}
