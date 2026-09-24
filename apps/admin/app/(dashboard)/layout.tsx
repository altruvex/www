import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { MFA_SETUP_PATH, MFA_SKIP_COOKIE, mfaRequired } from "@/lib/mfa";
import { requireAdminPage } from "@/lib/require-admin";
import { getShellBadges } from "@/lib/shell-data";
import { toProductRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already refused anyone who is not ADMIN+; this is the second
  // line. The access decision is made here from the session itself, so a
  // proxy bypass in the framework never becomes an unauthenticated read of
  // the pages underneath.
  const [session, shell] = await Promise.all([requireAdminPage(), getShellBadges()]);

  const dbRole = (session.user as { role?: string }).role;

  // An operator who has not enrolled in two-factor is sent to the enrolment
  // screen: always when it is required, otherwise until they choose "Skip for
  // now" in this browser. The screen lives outside this layout, so this
  // cannot redirect to itself.
  const enrolled = Boolean(
    (session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled,
  );
  if (!enrolled) {
    const skipped = (await cookies()).has(MFA_SKIP_COOKIE);
    if (mfaRequired() || !skipped) redirect(MFA_SETUP_PATH);
  }

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: dbRole,
      }}
      role={toProductRole(dbRole)}
      badges={shell.badges}
      unreadCount={shell.unread}
    >
      {children}
    </AppShell>
  );
}
