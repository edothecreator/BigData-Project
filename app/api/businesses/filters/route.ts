import { NextResponse } from "next/server";

import { getFilterOptions } from "@/lib/businesses/queries";
import { classifyDbError, statusForError } from "@/lib/businesses/api-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const options = await getFilterOptions();
    return NextResponse.json(options, {
      status: 200,
      // Filter options change rarely; allow a brief client cache but keep it
      // revalidated. The dataset is static during development.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const envelope = classifyDbError(err);
    return NextResponse.json(envelope, {
      status: statusForError(envelope),
      headers: { "Cache-Control": "no-store" },
    });
  }
}
