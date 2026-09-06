import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { getShellBadges } from "@/lib/shell-data";
import { toProductRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already refused anyone who is not ADMIN+, so this call is for
  // identity and role resolution, not for the access decision.
  const [session, shell] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getShellBadges(),
  ]);

  const dbRole = (session?.user as { role?: string } | undefined)?.role;

  return (
    <AppShell
      user={{
        name: session?.user?.name,
        email: session?.user?.email,
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
