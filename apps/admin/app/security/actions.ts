"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MFA_SKIP_COOKIE, MFA_SKIP_DAYS, mfaRequired } from "@/lib/mfa";
import { requireAdminPage } from "@/lib/require-admin";

export async function skipTwoFactor() {
  await requireAdminPage();
  if (mfaRequired()) redirect("/security");
  (await cookies()).set(MFA_SKIP_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MFA_SKIP_DAYS * 24 * 60 * 60,
  });
  redirect("/");
}
