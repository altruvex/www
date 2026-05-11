import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  const session = request.cookies.get("admin-session");
  const adminSecret = process.env.ADMIN_SECRET;

  const publicPaths = ["/login", "/api/auth/login", "/offline"];
  const isPublicPath = publicPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith("/api/auth/"),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!adminSecret) {
    return NextResponse.json(
      { error: "Admin access not configured" },
      { status: 503 },
    );
  }

  const msgUint8 = new TextEncoder().encode(
    adminSecret + (process.env.ADMIN_SECRET_PEPPER || "default-pepper"),
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!session || session.value !== expectedToken) {
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
