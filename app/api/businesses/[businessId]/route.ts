import { NextResponse, type NextRequest } from "next/server";

import { getBusinessDetail } from "@/lib/businesses/queries";
import { businessIdSchema } from "@/lib/businesses/schema";
import {
  classifyDbError,
  statusForError,
} from "@/lib/businesses/api-helpers";
import type { BusinessApiError } from "@/lib/businesses/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  const parsed = businessIdSchema.safeParse(businessId);
  if (!parsed.success) {
    const err: BusinessApiError = {
      error: true,
      code: "VALIDATION_FAILED",
      message: "Invalid business id.",
    };
    return NextResponse.json(err, {
      status: statusForError(err),
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const detail = await getBusinessDetail(parsed.data);
    if (!detail) {
      const err: BusinessApiError = {
        error: true,
        code: "NOT_FOUND",
        message: "No business found with that id.",
      };
      return NextResponse.json(err, {
        status: statusForError(err),
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(detail, {
      status: 200,
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
