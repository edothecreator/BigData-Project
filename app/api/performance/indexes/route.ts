import { NextResponse, type NextRequest } from "next/server";

import {
  classifyDbError,
  statusForError,
  validationError,
} from "@/lib/businesses/api-helpers";
import type { BusinessApiError } from "@/lib/businesses/types";
import {
  ensureManagedIndex,
  listBusinessIndexes,
} from "@/lib/performance/queries";
import { ensureIndexSchema } from "@/lib/performance/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

function reply(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function badRequest(message: string) {
  const err: BusinessApiError = {
    error: true,
    code: "VALIDATION_FAILED",
    message,
  };
  return reply(err, statusForError(err));
}

/** True when there is no Origin header (same-origin GET-like tools) or it matches Host. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
  ].filter((h): h is string => Boolean(h));
  return hosts.includes(originHost);
}

/** GET: list current indexes on `businesses` (read-only). */
export async function GET() {
  try {
    return reply(await listBusinessIndexes(), 200);
  } catch (err) {
    const envelope = classifyDbError(err);
    return reply(envelope, statusForError(envelope));
  }
}

/**
 * POST { "index": "<allowlisted id>" }: create that ONE index if missing.
 * Idempotent; never drops or modifies indexes; key specs are server-side only.
 *
 * Guards against cross-site use: requires a JSON content type (which forces a
 * CORS preflight from other origins) and, when present, a same-origin Origin.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return badRequest("Content-Type must be application/json.");
  }
  if (!isSameOrigin(request)) {
    return badRequest("Cross-origin requests are not allowed.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = ensureIndexSchema.safeParse(body);
  if (!parsed.success) {
    const err = validationError(parsed.error);
    return reply(err, statusForError(err));
  }

  try {
    return reply(await ensureManagedIndex(parsed.data.index), 200);
  } catch (err) {
    const envelope = classifyDbError(err);
    return reply(envelope, statusForError(envelope));
  }
}
