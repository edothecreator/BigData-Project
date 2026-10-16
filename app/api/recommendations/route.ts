import { NextResponse, type NextRequest } from "next/server";

import { getRecommendations } from "@/lib/recommendations/queries";
import { recommendationQuerySchema } from "@/lib/recommendations/schema";
import {
  classifyDbError,
  statusForError,
  validationError,
} from "@/lib/recommendations/api-helpers";
import type { RecommendationApiError } from "@/lib/recommendations/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const parsed = recommendationQuerySchema.safeParse(params);
  if (!parsed.success) {
    const err = validationError(parsed.error);
    return NextResponse.json(err, {
      status: statusForError(err),
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const result = await getRecommendations(
      parsed.data.businessId,
      parsed.data.strategy,
      parsed.data.limit,
    );

    if (!result) {
      const err: RecommendationApiError = {
        error: true,
        code: "NOT_FOUND",
        message: "No business found with that id.",
      };
      return NextResponse.json(err, {
        status: statusForError(err),
        headers: { "Cache-Control": "no-store" },
      });
    }

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
