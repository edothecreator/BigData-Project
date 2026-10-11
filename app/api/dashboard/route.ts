import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/dashboard/queries";
import type { DashboardError } from "@/lib/dashboard/types";

// Always run this handler dynamically. Dashboard data must reflect the live
// database on every request, never a stale static/edge cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    // Distinguish an unreachable server (most common in local dev) from other
    // failures so the UI can show an honest, actionable recovery message.
    const message = err instanceof Error ? err.message : String(err);
    const isUnreachable =
      /ECONNREFUSED|ServerSelectionTimeout|connect|getaddrinfo|topology/i.test(
        message,
      );

    const body: DashboardError = {
      error: true,
      code: isUnreachable ? "DB_UNREACHABLE" : "QUERY_FAILED",
      message: isUnreachable
        ? "Could not reach MongoDB at the configured URI. Make sure the local server is running on 127.0.0.1:27017 and that the yelp_analytics database exists."
        : `The dashboard query failed: ${message}`,
    };

    // 503 for an unreachable dependency, 500 for an unexpected query failure.
    return NextResponse.json(body, {
      status: isUnreachable ? 503 : 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
