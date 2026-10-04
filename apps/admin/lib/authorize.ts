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
  role: Role | undefined;
};

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

export async function currentRole(): Promise<Role | undefined> {
  return (await getOperator())?.role;
}

export async function authorize(action: Action, subject: Subject) {
  const operator = await getOperator();
  if (!operator || !can(operator.role, action, subject)) {
    throw new Error(`Not permitted: ${action} ${subject}`);
  }
  return operator.session;
}
