import type { NextRequest } from "next/server";

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

export function toAbsoluteUrl(url: string, request: NextRequest): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${publicBaseUrl(request)}${url.startsWith("/") ? "" : "/"}${url}`;
}

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
