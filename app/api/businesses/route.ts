import { NextResponse, type NextRequest } from "next/server";

import { getBusinessList } from "@/lib/businesses/queries";
import { listQuerySchema } from "@/lib/businesses/schema";
import {
  classifyDbError,
  statusForError,
  validationError,
} from "@/lib/businesses/api-helpers";

// Live data on every request — never a stale static/edge cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const parsed = listQuerySchema.safeParse(params);
  if (!parsed.success) {
    const err = validationError(parsed.error);
    return NextResponse.json(err, {
      status: statusForError(err),
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const result = await getBusinessList(parsed.data);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  } catch (err) {
    const envelope = classifyDbError(err);
    return NextResponse.json(envelope, {
      status: statusForError(envelope),
      headers: { "Cache-Control": "no-store" },
    });
  }
}
