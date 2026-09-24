import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

type Locale = (typeof routing.locales)[number];

const isLocale = (value: string): value is Locale =>
  routing.locales.some((locale) => locale === value);

/**
 * The language of the page that sent the request. A rate limit refuses
 * before the body is read, so the body's `locale` is not available yet; the
 * page's own path is (`/ar/schedule`), because the site's Referrer-Policy
 * (strict-origin-when-cross-origin) keeps the full URL on same-origin calls.
 * The default locale has no prefix, so anything else falls back to it.
 */
function localeFromReferer(request: NextRequest): Locale {
  const referer = request.headers.get("referer");
  if (!referer) return routing.defaultLocale;
  try {
    const [first = ""] = new URL(referer).pathname.split("/").filter(Boolean);
    return isLocale(first) ? first : routing.defaultLocale;
  } catch {
    return routing.defaultLocale;
  }
}

/** The 429 every public form endpoint returns, in the visitor's language. */
export async function tooManyRequests(
  request: NextRequest,
  retryAfterSeconds: number,
  locale?: string,
): Promise<NextResponse> {
  const resolved = locale && isLocale(locale) ? locale : localeFromReferer(request);
  const t = await getTranslations({ locale: resolved, namespace: "validations" });

  return NextResponse.json(
    { success: false, message: t("too-many-requests") },
    { status: 429, headers: { "Retry-After": retryAfterSeconds.toString() } },
  );
}
