import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

type Locale = (typeof routing.locales)[number];

const isLocale = (value: string): value is Locale =>
  routing.locales.some((locale) => locale === value);

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
