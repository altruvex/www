// The contract between the public form APIs (/api/contact, /api/schedule,
// /api/exit-intent, /api/transparency-lead) and the forms that call them.
//
// The server never sends user-facing text. A refusal carries a stable `code`
// and, for validation, `fields` mapping each field to a key in the
// `validations` namespace. The client turns both into copy in the visitor's
// locale, so an Arabic visitor never reads an English server string.

export const API_ERROR_CODES = [
  "validation",
  "bad_request",
  "forbidden",
  "not_found",
  "rate_limited",
  "server",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Client-side only: the request never got a response. */
type FormErrorCode = ApiErrorCode | "network";

type ApiFailure = {
  ok: false;
  code: ApiErrorCode;
  fields?: Record<string, string>;
};

type ApiSuccess<T extends object = object> = { ok: true } & T;

type ApiResult<T extends object = object> = ApiSuccess<T> | ApiFailure;

const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  API_ERROR_CODES.some((code) => code === value);

/** Message key (in `validations`) for a form-level error code. */
export const FORM_ERROR_KEY: Record<FormErrorCode, string> = {
  validation: "errors.validation",
  bad_request: "errors.badRequest",
  forbidden: "errors.forbidden",
  not_found: "errors.notFound",
  rate_limited: "errors.rateLimited",
  server: "errors.server",
  network: "errors.network",
};

/**
 * Reads a form API response into a typed result. A body that is not JSON, or
 * a refusal without a known code, is classified by HTTP status so the visitor
 * still gets a localized line.
 */
export async function readApiResult<T extends object = object>(
  response: Response,
): Promise<ApiResult<T>> {
  const body: unknown = await response.json().catch(() => null);
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if (response.ok && record.ok === true) {
    return record as ApiSuccess<T>;
  }

  const code: ApiErrorCode = isApiErrorCode(record.code)
    ? record.code
    : response.status === 429
      ? "rate_limited"
      : response.status === 403
        ? "forbidden"
        : response.status === 404
          ? "not_found"
          : response.status >= 400 && response.status < 500
            ? "bad_request"
            : "server";

  const fields =
    record.fields && typeof record.fields === "object"
      ? Object.fromEntries(
          Object.entries(record.fields as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : undefined;

  return { ok: false, code, fields };
}

type ValidationsTranslator = ((key: string) => string) & {
  has: (key: string) => boolean;
};

/**
 * Localized line for one server field code (a `validations` key such as
 * `contact.name-min`). Unknown codes fall back to the form's own line.
 */
export function fieldErrorMessage(
  t: ValidationsTranslator,
  code: string | undefined,
  fallback: string,
): string {
  return code && t.has(code) ? t(code) : fallback;
}
