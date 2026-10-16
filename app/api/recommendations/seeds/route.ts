import { NextResponse, type NextRequest } from "next/server";

import { searchSeeds } from "@/lib/recommendations/queries";
import { seedSearchSchema } from "@/lib/recommendations/schema";
import {
  classifyDbError,
  statusForError,
  validationError,
} from "@/lib/recommendations/api-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const parsed = seedSearchSchema.safeParse(params);
  if (!parsed.success) {
    const err = validationError(parsed.error);
    return NextResponse.json(err, {
      status: statusForError(err),
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const items = await searchSeeds(parsed.data.search, parsed.data.limit);
    return NextResponse.json(
      { items, generatedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const envelope = classifyDbError(err);
    return NextResponse.json(envelope, {
      status: statusForError(envelope),
      headers: { "Cache-Control": "no-store" },
    });
  }
}
