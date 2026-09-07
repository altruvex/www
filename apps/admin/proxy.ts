import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./lib/auth";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

export default async function proxy(request: NextRequest) {
  const publicPaths = ["/login", "/offline"];
  // Client-facing surfaces. Each is reached by a single-purpose unguessable
  // token rather than a session, so the admin gate would only ever redirect the
  // client it is meant to serve to a login they cannot pass.
  const publicPrefixes = [
    "/api/auth/",
    "/sign/",
    "/api/sign/",
    "/portal/",
    "/api/portal/",
    "/client-portal/",
    "/api/client-portal/",
    // CI ingest. A build agent holds a per-product bearer token, never a
    // session, so the admin gate would redirect every pipeline to a login it
    // cannot pass. Authenticity is the token check in lib/ingest-auth.ts —
    // which is scoped to exactly one product and grants no read access.
    "/api/ingest/",
  ];
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    publicPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix)) ||
    // Meta calls this directly (verification handshake + delivery/inbound
    // events) with no session cookie — authenticity is the webhook's own
    // X-Hub-Signature-256 check, not this proxy.
    request.nextUrl.pathname === "/api/whatsapp/webhook";

  if (isPublicPath) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || !ADMIN_ROLES.has((session.user as { role?: string }).role ?? "")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-*.js).*)",
  ],
};
