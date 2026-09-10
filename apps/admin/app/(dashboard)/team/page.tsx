import { prisma } from "@repo/database";
import { headers } from "next/headers";
import { Check, Minus } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { AlertBar } from "@/components/os/error-state";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { Avatar } from "@repo/ui";
import { ToneBadge } from "@/components/ui/badge";
import {
  ACTIONS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  SUBJECTS,
  can,
  toProductRole,
} from "@/lib/rbac";
import type { Role } from "@/lib/nav";
import { dateTime, when } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["OWNER", "ADMIN", "SALES", "PM", "FINANCE", "VIEWER"];

export default async function TeamPage() {
  const [session, users, sessions] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: { userId: true, updatedAt: true, ipAddress: true },
    }),
  ]);

  const currentId = session?.user?.id;
  const lastSeen = new Map<string, Date>();
  for (const s of sessions) {
    const existing = lastSeen.get(s.userId);
    if (!existing || s.updatedAt > existing) lastSeen.set(s.userId, s.updatedAt);
  }

  const admins = users.filter((u) => u.role === "ADMIN" || u.role === "SUPERADMIN");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team"
        description="People, roles, and exactly what each role may do. The permission grid below is the real matrix the server enforces, not a description of it."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="People" value={users.length} sub="Accounts in the system" />
        <StatTile label="With admin access" value={admins.length} sub="Can reach this application" />
        <StatTile
          label="Signed in now"
          value={lastSeen.size}
          sub={lastSeen.size ? "Active sessions" : "Nobody"}
          tone={lastSeen.size ? "success" : "neutral"}
        />
      </div>

      <AlertBar tone="info" href="/settings?tab=security" cta="Security settings">
        The database currently stores three roles (USER, ADMIN, SUPERADMIN). The six
        product roles below are mapped onto those in <code className="font-mono text-micro">lib/rbac.ts</code> —
        SUPERADMIN is Owner, ADMIN is Admin. Sales, PM, Finance and Viewer are defined
        and enforced in code, but no user can hold them until the schema carries them.
      </AlertBar>

      <Panel title="People" flush>
        <ul className="rows">
          {users.map((user) => {
            const productRole = toProductRole(user.role);
            const seen = lastSeen.get(user.id);
            return (
              <li key={user.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <Avatar name={user.name ?? user.email} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-base font-medium">
                    {user.name ?? "Unnamed"}
                    {user.id === currentId && (
                      <span className="telemetry text-subtle-foreground">you</span>
                    )}
                  </p>
                  <p className="truncate text-meta text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-end">
                  <p className="font-mono text-micro text-subtle-foreground">
                    {seen ? `active ${when(seen)}` : "no active session"}
                  </p>
                  <p className="font-mono text-micro text-subtle-foreground">
                    joined {dateTime(user.createdAt)}
                  </p>
                </div>
                <ToneBadge tone={productRole ? "info" : "neutral"}>
                  {productRole ? ROLE_LABELS[productRole] : user.role}
                </ToneBadge>
                {/* Removing people is an Owner action, and the server refuses
                    the two cases that would lock this app: your own account,
                    and the last superadmin. */}
                {user.id !== currentId && (
                  <DeleteRecordButton
                    entity="user"
                    id={user.id}
                    label={user.name ?? user.email}
                    variant="ghost"
                    size="icon-sm"
                  >
                    {null}
                  </DeleteRecordButton>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        title="Permission matrix"
        description="What each role may do. This grid is generated from the same table the server checks."
        flush
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="telemetry sticky start-0 h-8 bg-surface px-3 text-start font-normal text-subtle-foreground">
                  Role
                </th>
                {SUBJECTS.map((subject) => (
                  <th
                    key={subject}
                    className="telemetry h-8 px-2 text-start font-normal text-subtle-foreground"
                  >
                    {subject}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role} className="border-b border-border last:border-b-0">
                  <th
                    scope="row"
                    className="sticky start-0 bg-card px-3 py-2 text-start align-top font-normal"
                  >
                    <span className="block font-medium">{ROLE_LABELS[role]}</span>
                    <span className="block max-w-48 text-meta text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </th>
                  {SUBJECTS.map((subject) => {
                    const allowed = ACTIONS.filter((action) => can(role, action, subject));
                    return (
                      <td key={subject} className="px-2 py-2 align-top">
                        {allowed.length === 0 ? (
                          <Minus className="size-3 text-subtle-foreground" aria-label="no access" />
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {allowed.map((action) => (
                              <span
                                key={action}
                                className={cn(
                                  "rounded-xs border px-1 font-mono text-micro",
                                  action === "delete"
                                    ? "border-danger/25 bg-danger/10 text-danger"
                                    : "border-border bg-surface text-muted-foreground",
                                )}
                              >
                                {action.slice(0, 3)}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-meta text-muted-foreground">
          <Check className="size-3" aria-hidden />
          Abbreviations: vie=view, cre=create, edi=edit, del=delete, app=approve, sen=send, exp=export.
        </p>
      </Panel>
    </div>
  );
}
