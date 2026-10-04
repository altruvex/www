import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { MFA_SETUP_PATH, MFA_SKIP_COOKIE, mfaRequired } from "@/lib/mfa";
import { requireAdminPage } from "@/lib/require-admin";
import { getShellBadges } from "@/lib/shell-data";
import { currentRole } from "@/lib/authorize";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminPage();

  const dbRole = (session.user as { role?: string }).role;

  const enrolled = Boolean(
    (session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled,
  );
  if (!enrolled) {
    const skipped = (await cookies()).has(MFA_SKIP_COOKIE);
    if (mfaRequired() || !skipped) redirect(MFA_SETUP_PATH);
  }

  const shell = await getShellBadges(session.user.id);
  const role = await currentRole();

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: dbRole,
      }}
      role={role}
      badges={shell.badges}
      unreadCount={shell.unread}
    >
      {children}
    </AppShell>
  );
}
