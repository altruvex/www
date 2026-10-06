import type { ApiErrorCode } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Server half of the form API contract in lib/api-errors.ts: refusals carry a
// stable code, never English copy. The client localizes.

const STATUS: Record<ApiErrorCode, number> = {
  validation: 400,
  bad_request: 400,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  server: 500,
};

export function apiError(
  code: ApiErrorCode,
  options: { fields?: Record<string, string>; headers?: HeadersInit } = {},
): NextResponse {
  const { fields, headers } = options;
  return NextResponse.json(
    { ok: false, code, ...(fields ? { fields } : {}) },
    { status: STATUS[code], headers },
  );
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return apiError("rate_limited", {
    headers: { "Retry-After": retryAfterSeconds.toString() },
  });
}

/**
 * Schemas are built with `codeTranslator`, so each issue message is already a
 * `validations` key; this collects the first one per top-level field.
 */
function validationError(error: ZodError): NextResponse {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const [first] = issue.path;
    const field = typeof first === "string" ? first : "form";
    fields[field] ??= issue.message;
  }
  return apiError("validation", { fields });
}

/** Translator for the shared zod schemas that returns the key itself. */
export const codeTranslator = (key: string): string => key;

/** Body parse that maps malformed JSON to a 400, not a 500. */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Handles the shared tail of every form route's catch block. */
export function unexpectedError(error: unknown, label: string): NextResponse {
  if (error instanceof ZodError) return validationError(error);
  if (process.env.NODE_ENV !== "production") {
    console.error(`${label}:`, error);
  }
  return apiError("server");
}
