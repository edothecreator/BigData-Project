import { Suspense } from "react";

import { BusinessExplorerView } from "@/components/businesses/business-explorer-view";

// Client-driven view that reads/writes URL search params and fetches live data.
export const dynamic = "force-dynamic";

export default function BusinessesPage() {
  // useSearchParams (inside the view's hook) requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <BusinessExplorerView />
    </Suspense>
  );
}
