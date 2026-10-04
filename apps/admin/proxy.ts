import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./lib/auth";
import { NONCE_HEADER, contentSecurityPolicy } from "./lib/csp";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

function withCsp(request: NextRequest, response: NextResponse): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  request.headers.set(NONCE_HEADER, nonce);
  request.headers.set("content-security-policy", policy);
  response.headers.set("content-security-policy", policy);
  response.headers.set(NONCE_HEADER, nonce);
  return response;
}

export default async function proxy(request: NextRequest) {
  const publicPaths = ["/login", "/offline", "/reset-password"];
  const publicPrefixes = [
    "/api/auth/",
    "/sign/",
    "/api/sign/",
    "/quote/",
    "/api/quote/",
    "/portal/",
    "/api/portal/",
    "/client-portal/",
    "/api/client-portal/",
    "/api/ingest/",
    "/api/cron/",
  ];
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    publicPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix)) ||
    request.nextUrl.pathname === "/api/whatsapp/webhook";

  if (isPublicPath) {
    return withCsp(
      request,
      NextResponse.next({ request: { headers: request.headers } }),
    );
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || !ADMIN_ROLES.has((session.user as { role?: string }).role ?? "")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return withCsp(request, NextResponse.next({ request: { headers: request.headers } }));
}

export const config = {
  matcher: [
    "/((?!_next/static/|(?:_next/image|_next/webpack-hmr|_next/turbopack-hmr|favicon\\.ico|favicon\\.svg|favicon-96x96\\.png|apple-touch-icon\\.png|web-app-manifest-192x192\\.png|web-app-manifest-512x512\\.png|manifest\\.json|manifest\\.webmanifest|sw\\.js|workbox-[\\w-]+\\.js)$).*)",
  ],
};
