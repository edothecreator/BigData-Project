import { NextResponse, type NextRequest } from "next/server";

import {
  classifyDbError,
  statusForError,
  validationError,
} from "@/lib/businesses/api-helpers";
import { runScenario } from "@/lib/performance/queries";
import { performanceQuerySchema } from "@/lib/performance/schema";

// Live measurements on every request — never cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

/**
 * GET /api/performance?scenario=<id>&state=&city=&search=
 * Runs ONE allowlisted, read-only scenario. Unknown keys / ids → 400.
 */
export async function GET(request: NextRequest) {
  const parsed = performanceQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    const err = validationError(parsed.error);
    return NextResponse.json(err, {
      status: statusForError(err),
      headers: NO_STORE,
    });
  }

  try {
    const { scenario, state, city, search } = parsed.data;
    const result = await runScenario(scenario, { state, city, search });
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (err) {
    const envelope = classifyDbError(err);
    return NextResponse.json(envelope, {
      status: statusForError(envelope),
      headers: NO_STORE,
    });
  }
}
