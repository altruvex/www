import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

type SessionLike = { user?: { role?: string } } | null | undefined;

/** The one place that decides what "an admin" is. */
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

/**
 * The page-side gate.
 *
 * The proxy refuses non-admins before a page renders, but a proxy is one
 * regex in front of every client, contract and payment record, and the
 * middleware-bypass class of Next.js advisory recurs. Every server component
 * that reads private data therefore sits under a layout that calls this and
 * makes its own decision from the session, not from the fact that it rendered.
 */
export async function requireAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdminSession(session as SessionLike)) {
    redirect("/login");
  }
  return session!;
}
