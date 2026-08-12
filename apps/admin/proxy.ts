import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./lib/auth";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

export default async function proxy(request: NextRequest) {
  const publicPaths = ["/login", "/offline"];
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    request.nextUrl.pathname.startsWith("/api/auth/");

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
