import { NextResponse } from "next/server";

import { listBusinessIndexes } from "@/lib/performance/queries";
import type { PerformanceApiError } from "@/lib/performance/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await listBusinessIndexes();
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const isUnreachable =
      /ECONNREFUSED|ServerSelectionTimeout|connect|getaddrinfo|topology/i.test(
        message,
      );
    const err: PerformanceApiError = {
      error: true,
      code: isUnreachable ? "DB_UNREACHABLE" : "QUERY_FAILED",
      message: isUnreachable
        ? "Could not reach MongoDB."
        : "Could not list indexes.",
    };
    return NextResponse.json(err, {
      status: isUnreachable ? 503 : 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
