import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

export async function requireAdminSession(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  if (!session || !ADMIN_ROLES.has(role)) {
    return null;
  }
  return session;
}
