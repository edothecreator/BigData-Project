import { DashboardView } from "@/components/dashboard/dashboard-view";

// The dashboard is a client-driven view that fetches live data from the API,
// so the page itself needs no server rendering of data. Keep it dynamic so no
// stale shell is cached.
export const dynamic = "force-dynamic";

export default function Page() {
  return <DashboardView />;
}
