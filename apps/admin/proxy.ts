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

// What this gate lets through unauthenticated is named file by file, never by
// extension. public/ also holds generated/proposals and generated/contracts —
// client documents that Next serves as ordinary static files, and this matcher
// is the only thing standing in front of them. A rule shaped like "any path
// ending in an image extension" would be one `.png` under generated/ away from
// publishing a client's contract, so the icons are listed by name and every
// other path in public/ stays gated.
//
// Each name is anchored with `$` so it matches that exact file and not a route
// that merely starts with it. `workbox-[\w-]+\.js` is the hashed chunk the PWA
// build emits next to sw.js; the previous `workbox-*.js` never matched it,
// because inside a regex the `*` repeats the hyphen rather than standing for a
// wildcard.
//
// The two HMR endpoints exist only under `next dev` — `next start` registers
// neither, so exempting them grants nothing in production — and gating them
// redirects the dev websocket to a login page it cannot complete. They are
// anchored like the rest: the exemption is those two paths, not any path that
// happens to begin with them.
//
// Spelled out as one literal rather than composed from parts: Next reads this
// matcher by static analysis at build time and ignores a value it cannot read.
export const config = {
  matcher: [
    "/((?!_next/static/|(?:_next/image|_next/webpack-hmr|_next/turbopack-hmr|favicon\\.ico|favicon\\.svg|favicon-96x96\\.png|apple-touch-icon\\.png|web-app-manifest-192x192\\.png|web-app-manifest-512x512\\.png|manifest\\.json|manifest\\.webmanifest|sw\\.js|workbox-[\\w-]+\\.js)$).*)",
  ],
};
