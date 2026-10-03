import { prisma } from "@repo/database";
import { Check, Minus } from "lucide-react";
import { Avatar } from "@repo/ui";

import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { ToneBadge } from "@/components/ui/badge";
import { getOperator } from "@/lib/authorize";
import { emailTransport } from "@/lib/email";
import { dateTime, when } from "@/lib/format";
import {
  ACTIONS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  SUBJECTS,
  can,
  resolveRole,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { AccessLinkButton } from "./access-link-button";
import { InviteMember } from "./invite-member";
import { RoleSelect } from "./role-select";
import { MemberSessions, type SessionRow } from "./session-list";

export const dynamic = "force-dynamic";

/**
 * People, roles and sessions. Everything an operator can do here is a server
 * action in `_actions/team.ts` that re-checks the capability; the page only
 * decides what to draw. Nothing on it is a secret: the session token is
 * compared on the server and never sent, and a member's second factor is
 * shown as on or off, never as a key or a code.
 */
export default async function TeamPage() {
  const now = new Date();
  const [operator, users, sessions] = await Promise.all([
    getOperator(),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        opsRole: true,
        createdAt: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
        accounts: { where: { providerId: "credential" }, select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.findMany({
      where: { expiresAt: { gt: now } },
      select: {
        id: true,
        userId: true,
        token: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const me = operator?.session.user.id;
  const myToken = operator?.session.session.token;
  const myRole = operator?.role;
  const canInvite = can(myRole, "create", "team");
  const canManage = can(myRole, "edit", "team");
  const canRemove = can(myRole, "delete", "team");
  const transportConfigured = emailTransport() !== "none";

  // The token decides which row is "this browser", then stays on the server.
  const sessionsByUser = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const row: SessionRow = {
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      current: s.token === myToken,
    };
    sessionsByUser.set(s.userId, [...(sessionsByUser.get(s.userId) ?? []), row]);
  }

  const members = users.map((user) => ({
    ...user,
    productRole: resolveRole(user),
    hasPassword: user.accounts.length > 0,
    sessions: sessionsByUser.get(user.id) ?? [],
  }));
  const owners = members.filter((m) => m.productRole === "OWNER").length;
  const withTwoFactor = members.filter((m) => m.twoFactorEnabled).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team"
        description="People, roles, and exactly what each role may do. The permission grid below is the real matrix the server enforces, not a description of it."
        actions={canInvite ? <InviteMember transportConfigured={transportConfigured} allowOwner={myRole === "OWNER"} /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="People" value={members.length} sub="Accounts in the system" />
        <StatTile label="Owners" value={owners} sub="Can manage people and settings" tone={owners === 1 ? "warning" : "neutral"} />
        <StatTile
          label="Signed in now"
          value={sessionsByUser.size}
          sub={sessionsByUser.size ? `${sessions.length} active session${sessions.length === 1 ? "" : "s"}` : "Nobody"}
          tone={sessionsByUser.size ? "success" : "neutral"}
        />
        <StatTile
          label="Two-factor on"
          value={`${withTwoFactor} / ${members.length}`}
          sub={withTwoFactor === members.length ? "Everyone" : "Not everyone"}
          tone={withTwoFactor === members.length ? "success" : "warning"}
        />
      </div>

      <Panel
        title="People"
        description={
          canManage
            ? "Roles take effect at the member's next request. You cannot change your own."
            : "Roles are changed by an owner."
        }
        flush
      >
        <ul className="rows">
          {members.map((member) => {
            const self = member.id === me;
            const label = member.name ?? member.email;
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                <Avatar name={label} size="lg" />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex items-center gap-2 truncate text-base font-medium">
                    {member.name ?? "Unnamed"}
                    {self && <span className="telemetry text-subtle-foreground">you</span>}
                  </p>
                  <p className="truncate text-meta text-muted-foreground">{member.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {!member.hasPassword && (
                    <ToneBadge tone="warning">Invited — no password yet</ToneBadge>
                  )}
                  <ToneBadge tone={member.twoFactorEnabled ? "success" : "neutral"}>
                    {member.twoFactorEnabled ? "2FA on" : "2FA off"}
                  </ToneBadge>
                </div>

                <div className="text-end">
                  <p className="font-mono text-micro text-subtle-foreground">
                    {member.lastLoginAt ? `last sign-in ${when(member.lastLoginAt)}` : "never signed in"}
                  </p>
                  <p className="font-mono text-micro text-subtle-foreground">joined {dateTime(member.createdAt)}</p>
                </div>

                <MemberSessions
                  userId={member.id}
                  label={label}
                  sessions={member.sessions}
                  canRevoke={self || canManage}
                  own={self}
                />

                {canManage && !self ? (
                  <RoleSelect userId={member.id} role={member.productRole} allowOwner={myRole === "OWNER"} />
                ) : (
                  <ToneBadge tone={member.productRole ? "info" : "neutral"}>
                    {member.productRole ? ROLE_LABELS[member.productRole] : member.role}
                  </ToneBadge>
                )}

                {canManage && transportConfigured && (
                  <AccessLinkButton userId={member.id} kind={member.hasPassword ? "reset" : "invite"} />
                )}

                {/* Removing people is an Owner action, and the server refuses
                    the two cases that would lock this app: your own account,
                    and the last superadmin. */}
                {canRemove && !self && (
                  <DeleteRecordButton entity="user" id={member.id} label={label} size="icon-sm">
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
