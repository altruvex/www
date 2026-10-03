import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@repo/database";
import { auth } from "@/lib/auth";
import { can, resolveRole, type Subject, type Action } from "@/lib/rbac";
import type { Role } from "@/lib/nav";

type SessionUser = {
  id: string;
  role?: string | null;
  opsRole?: string | null;
};

export type Operator = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  /** The product role every capability decision is made from. */
  role: Role | undefined;
};

/**
 * The signed-in operator and their resolved product role, read once per
 * request.
 *
 * `opsRole` is declared as an additional user field in `lib/auth.ts`, so the
 * session read already carries it; the Prisma lookup below only runs for a
 * session that predates that declaration, or a store that dropped the field.
 * Wrapped in React's `cache` so a page that authorises three actions pays for
 * one session read.
 */
export const getOperator = cache(async (): Promise<Operator | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  let user = session.user as unknown as SessionUser;
  if (!("opsRole" in user)) {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, opsRole: true },
    });
    user = { id: user.id, role: row?.role ?? user.role, opsRole: row?.opsRole ?? null };
  }

  return { session, role: resolveRole(user) };
});

/** The current operator's product role, or `undefined` when nobody is signed in. */
export async function currentRole(): Promise<Role | undefined> {
  return (await getOperator())?.role;
}

/**
 * The capability check every server action runs before it mutates.
 *
 * Throws when the signed-in operator's role may not perform `action` on
 * `subject`; returns the session otherwise, for the audit actor. The proxy and
 * the dashboard layout have already refused anyone who is not an admin — this
 * is the finer, per-capability decision on top.
 */
export async function authorize(action: Action, subject: Subject) {
  const operator = await getOperator();
  if (!operator || !can(operator.role, action, subject)) {
    throw new Error(`Not permitted: ${action} ${subject}`);
  }
  return operator.session;
}
