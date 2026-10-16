import { NextResponse, type NextRequest } from "next/server";
import { getReviewAnalytics } from "@/lib/reviews/queries";
import { reviewsQuerySchema } from "@/lib/reviews/schema";
import { classifyDbError, statusForError, validationError } from "@/lib/businesses/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
const headers = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET(request: NextRequest) {
  const parsed = reviewsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    const error = validationError(parsed.error);
    return NextResponse.json(error, { status: statusForError(error), headers });
  }
  try {
    return NextResponse.json(await getReviewAnalytics(), { headers });
  } catch (cause) {
    const error = classifyDbError(cause);
    // Do not include raw driver messages / connection strings in the response.
    error.message = error.code === "DB_UNREACHABLE"
      ? "Could not reach MongoDB. Check that the database service is running and the server environment is configured."
      : "Review analytics could not be computed. Please retry.";
    return NextResponse.json(error, { status: statusForError(error), headers });
  }
}
