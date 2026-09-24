import type { NextRequest } from "next/server";

/**
 * The origin every client-facing link is built on — sign links, portal links,
 * the document link in a proposal email.
 *
 * It comes from BETTER_AUTH_URL, never from the request, in production. The
 * request's origin is the `Host` header, and a link texted or emailed to a
 * client must not carry whatever host the caller chose to present. Local
 * development falls back to the request origin because a laptop has no fixed
 * public address and `lib/env.ts` does not require the variable there.
 */
export function publicBaseUrl(request: NextRequest): string {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_URL is not set. Client-facing links are built on it and are never derived from the request host in production.",
    );
  }
  return request.nextUrl.origin;
}

/** Absolute URL on the public origin; absolute input is returned unchanged. */
export function toAbsoluteUrl(url: string, request: NextRequest): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${publicBaseUrl(request)}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * The same base for a server action or server component, which has request
 * headers but no NextRequest. Same rule: in production only BETTER_AUTH_URL.
 */
export function publicBaseUrlFromHeaders(headers: Headers): string {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_URL is not set. Client-facing links are built on it and are never derived from the request host in production.",
    );
  }
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3011";
  const proto = headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
