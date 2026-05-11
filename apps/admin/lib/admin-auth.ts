import type { NextRequest } from "next/server";

export async function isAdminAuthed(request: NextRequest): Promise<boolean> {
  const adminSession = request.cookies.get("admin-session");
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || !adminSession) return false;

  const msgUint8 = new TextEncoder().encode(
    adminSecret + (process.env.ADMIN_SECRET_PEPPER || "default-pepper"),
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return adminSession.value === expectedToken;
}
