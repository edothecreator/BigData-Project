import { NextRequest, NextResponse } from "next/server";

import { classifyDbError, statusForError, validationError } from "@/lib/businesses/api-helpers";
import { getInsightsData } from "@/lib/insights/queries";
import { insightsQuerySchema } from "@/lib/insights/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // Reject repeated values as well as unknown keys, rather than silently picking
  // a different filter than the caller intended.
  if ([...params.keys()].some((key) => params.getAll(key).length > 1)) {
    return NextResponse.json({ error: true, code: "VALIDATION_FAILED", message: "Query parameters must not be repeated." }, { status: 400, headers });
  }
  const parsed = insightsQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400, headers });
  try {
    return NextResponse.json(await getInsightsData(parsed.data), { headers });
  } catch (err) {
    const error = classifyDbError(err);
    // Keep internal MongoDB query details out of the browser.
    if (error.code === "QUERY_FAILED") error.message = "Market insights could not be calculated. Try refreshing or check the server logs.";
    console.error("Market Insights query failed", err);
    return NextResponse.json(error, { status: statusForError(error), headers });
  }
}
