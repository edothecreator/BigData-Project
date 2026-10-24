import { NextResponse, type NextRequest } from "next/server";

import { runScenario } from "@/lib/performance/queries";
import { performanceQuerySchema } from "@/lib/performance/schema";
import type { PerformanceApiError } from "@/lib/performance/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET(request: NextRequest) {
  const parsed = performanceQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    const err: PerformanceApiError = {
      error: true,
      code: "VALIDATION_FAILED",
      message: "Invalid scenario or parameters.",
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    };
    return NextResponse.json(err, { status: 400, headers });
  }

  try {
    const { scenario, state, city, search } = parsed.data;
    const result = await runScenario(scenario, { state, city, search });
    return NextResponse.json(result, { status: 200, headers });
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
        ? "Could not reach MongoDB. Make sure the local server is running on 127.0.0.1:27017."
        : "The performance scenario could not be executed. Please retry.",
    };
    return NextResponse.json(err, {
      status: isUnreachable ? 503 : 500,
      headers,
    });
  }
}
