"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma, type Prisma } from "@repo/database";

import { auth } from "@/lib/auth";
import { getOperator } from "@/lib/authorize";
import { recordActivity, recordChange, userActor } from "@/lib/activity-log";
import { emailTransport, looksLikeAnAddress } from "@/lib/email";
import type { Role } from "@/lib/nav";
import { ROLE_LABELS, can, isRole, resolveRole } from "@/lib/rbac";
import { roleChangeRefusal } from "@/lib/team-rules";

/**
 * Team actions: who is in the OS, what they may do, and which browsers they
 * are signed in from. Every refusal is returned as a sentence, never thrown,
 * because production Next.js replaces a thrown message with a digest.
 *
 * Nothing here ever sees a password or a token. An invitation is Better Auth's
 * own set-password link, generated and mailed inside `auth.api`; this file
 * only asks for it to be sent.
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

const refuse = (message: string): ActionResult => ({ ok: false, message });

/** Users who currently resolve to Owner: an explicit opsRole, or a superadmin with none. */
const OWNERS: Prisma.UserWhereInput = {
  OR: [{ opsRole: "OWNER" }, { opsRole: null, role: "SUPERADMIN" }],
};

const TEAM_PATHS = ["/team", "/settings"];
const refresh = () => TEAM_PATHS.forEach((path) => revalidatePath(path));

/** Where the set-password link lands. Must be a public path in proxy.ts. */
const SET_PASSWORD_PATH = "/reset-password";

export async function inviteMember(input: {
  name: string;
  email: string;
  role: string;
}): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator || !can(operator.role, "create", "team")) {
    return refuse("Only an owner can add people.");
  }
  if (emailTransport() === "none") {
    return refuse(
      "No email transport is configured, so an invitation cannot be sent. Set up Resend or SMTP under Integrations first.",
    );
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length === 0 || name.length > 80) return refuse("A name is required (up to 80 characters).");
  if (!looksLikeAnAddress(email)) return refuse("That does not look like an email address.");
  if (!isRole(input.role)) return refuse("Pick a role.");
  const role: Role = input.role;
  if (role === "OWNER" && operator.role !== "OWNER") {
    return refuse("Only an owner can grant the Owner role.");
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return refuse("Someone with that email already has an account.");

  // The auth role is ADMIN for everyone invited here: it is what lets them
  // past the proxy at all. What they may then do is the product role.
  const user = await prisma.user.create({
    data: { email, name, role: "ADMIN", opsRole: role, emailVerified: false },
    select: { id: true, name: true, email: true },
  });

  await recordActivity({
    action: "user.invited",
    actor: userActor(operator.session),
    entityType: "user",
    entityId: user.id,
    entityLabel: user.name || user.email,
    summary: `Invited ${user.name || user.email} as ${ROLE_LABELS[role]}`,
    after: { email: user.email, role: ROLE_LABELS[role] },
  });

  const sent = await sendSetPasswordLink(user.email);
  refresh();
  if (!sent.ok) {
    return refuse(
      `${user.name || user.email} was added, but the invitation email failed: ${sent.message} Use "Resend invite" once the transport is fixed.`,
    );
  }
  return { ok: true, message: `Invitation sent to ${user.email}.` };
}

/**
 * Re-sends the set-password link to a member — the invitation again for
 * someone who never set a password, a reset for someone who has.
 */
export async function sendAccessLink(userId: string): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator || !can(operator.role, "edit", "team")) {
    return refuse("Only an owner can send access links.");
  }
  if (emailTransport() === "none") {
    return refuse("No email transport is configured. Set up Resend or SMTP under Integrations first.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      accounts: { where: { providerId: "credential" }, select: { id: true } },
    },
  });
  if (!user) return refuse("That person no longer exists.");

  const kind = user.accounts.length === 0 ? "invite" : "reset";
  const sent = await sendSetPasswordLink(user.email);
  if (!sent.ok) return refuse(`The email failed: ${sent.message}`);

  await recordActivity({
    action: "user.access_link_sent",
    actor: userActor(operator.session),
    entityType: "user",
    entityId: user.id,
    entityLabel: user.name || user.email,
    summary:
      kind === "invite"
        ? `Re-sent the invitation to ${user.email}`
        : `Sent a password reset link to ${user.email}`,
    metadata: { kind },
  });
  refresh();
  return {
    ok: true,
    message: kind === "invite" ? `Invitation re-sent to ${user.email}.` : `Reset link sent to ${user.email}.`,
  };
}

/**
 * Better Auth generates the token, stores its expiry and calls the
 * `sendResetPassword` hook in lib/auth.ts with the URL. The token never
 * passes through this file. An unknown address is answered with success by
 * design (no enumeration), which is fine here: the row was just created.
 */
async function sendSetPasswordLink(email: string): Promise<ActionResult> {
  try {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: SET_PASSWORD_PATH },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    return refuse(error instanceof Error ? error.message : "the transport refused it.");
  }
}

export async function setMemberRole(userId: string, next: string): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator) return refuse("Sign in again.");
  if (!isRole(next)) return refuse("Pick a role.");

  const [target, owners] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, opsRole: true },
    }),
    prisma.user.count({ where: OWNERS }),
  ]);
  if (!target) return refuse("That person no longer exists.");

  const targetRole = resolveRole(target);
  const refusal = roleChangeRefusal({
    actorId: operator.session.user.id,
    actorRole: operator.role,
    targetId: target.id,
    targetRole,
    next,
    owners,
  });
  if (refusal) return refuse(refusal);

  await prisma.user.update({ where: { id: userId }, data: { opsRole: next } });

  const label = target.name || target.email;
  await recordChange({
    action: "user.role_changed",
    actor: userActor(operator.session),
    entityType: "user",
    entityId: target.id,
    entityLabel: label,
    summary: `Changed ${label}'s role to ${ROLE_LABELS[next]}`,
    before: { role: targetRole ? ROLE_LABELS[targetRole] : null },
    after: { role: ROLE_LABELS[next] },
  });
  refresh();
  return { ok: true, message: `${label} is now ${ROLE_LABELS[next]}.` };
}

/**
 * Ends one signed-in browser. Anyone may end their own other sessions; ending
 * someone else's needs the team capability. The session you are using right
 * now is not revocable from here — that is signing out.
 */
export async function revokeSession(sessionId: string): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator) return refuse("Sign in again.");

  const target = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      token: true,
      userId: true,
      ipAddress: true,
      userAgent: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!target) {
    refresh();
    return { ok: true, message: "That session had already ended." };
  }
  if (target.token === operator.session.session.token) {
    return refuse("That is the session you are using. Sign out instead.");
  }
  const own = target.userId === operator.session.user.id;
  if (!own && !can(operator.role, "edit", "team")) {
    return refuse("Only an owner can end another person's session.");
  }

  await prisma.session.deleteMany({ where: { id: target.id } });

  const label = target.user.name || target.user.email;
  await recordActivity({
    action: "user.session_revoked",
    actor: userActor(operator.session),
    entityType: "user",
    entityId: target.userId,
    entityLabel: label,
    summary: own
      ? `Ended one of their own sessions${target.ipAddress ? ` (${target.ipAddress})` : ""}`
      : `Ended a session of ${label}${target.ipAddress ? ` (${target.ipAddress})` : ""}`,
    metadata: { ipAddress: target.ipAddress ?? null, userAgent: target.userAgent ?? null },
  });
  refresh();
  return { ok: true, message: "Session ended." };
}

/** Ends every session of one member — all but the current one when it is you. */
export async function revokeAllSessions(userId: string): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator) return refuse("Sign in again.");

  const own = userId === operator.session.user.id;
  if (!own && !can(operator.role, "edit", "team")) {
    return refuse("Only an owner can end another person's sessions.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!target) return refuse("That person no longer exists.");

  const { count } = await prisma.session.deleteMany({
    where: own
      ? { userId, token: { not: operator.session.session.token } }
      : { userId },
  });

  const label = target.name || target.email;
  if (count > 0) {
    await recordActivity({
      action: "user.sessions_revoked",
      actor: userActor(operator.session),
      entityType: "user",
      entityId: target.id,
      entityLabel: label,
      summary: own
        ? `Ended ${count} other session${count === 1 ? "" : "s"} of their own`
        : `Ended ${count} session${count === 1 ? "" : "s"} of ${label}`,
      metadata: { count },
    });
  }
  refresh();
  return {
    ok: true,
    message: count === 0 ? "There was nothing to end." : `${count} session${count === 1 ? "" : "s"} ended.`,
  };
}
