import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "./lib/admin-auth";

export default async function proxy(request: NextRequest) {
  const session = request.cookies.get("admin-session");

  const publicPaths = ["/login", "/api/auth/login", "/offline"];
  const isPublicPath = publicPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith("/api/auth/"),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPepper = process.env.ADMIN_SECRET_PEPPER;

  if (!adminSecret || !adminEmail || !adminPepper) {
    return NextResponse.json(
      { error: "Admin access not configured" },
      { status: 503 },
    );
  }

  if (!session || !(await verifySessionToken(session.value))) {
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
