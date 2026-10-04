import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

type SessionLike = { user?: { role?: string } } | null | undefined;

export function isAdminSession(session: SessionLike): boolean {
  const role = session?.user?.role ?? "";
  return Boolean(session) && ADMIN_ROLES.has(role);
}

export async function requireAdminSession(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!isAdminSession(session as SessionLike)) {
    return null;
  }
  return session;
}

export async function requireAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdminSession(session as SessionLike)) {
    redirect("/login");
  }
  return session!;
}
