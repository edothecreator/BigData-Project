import { NextResponse, type NextRequest } from "next/server";

import { getMapData } from "@/lib/map/queries";
import { mapQuerySchema } from "@/lib/map/schema";
import type { MapApiError } from "@/lib/map/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const parsed = mapQuerySchema.safeParse(params);
  if (!parsed.success) {
    const err: MapApiError = {
      error: true,
      code: "VALIDATION_FAILED",
      message: "One or more parameters are invalid.",
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    };
    return NextResponse.json(err, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const result = await getMapData(parsed.data);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isUnreachable =
      /ECONNREFUSED|ServerSelectionTimeout|connect|getaddrinfo|topology/i.test(
        message,
      );
    const envelope: MapApiError = {
      error: true,
      code: isUnreachable ? "DB_UNREACHABLE" : "QUERY_FAILED",
      message: isUnreachable
        ? "Could not reach MongoDB. Make sure the local server is running on 127.0.0.1:27017."
        : `The query failed: ${message}`,
    };
    return NextResponse.json(envelope, {
      status: isUnreachable ? 503 : 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
