import "server-only";
import { prisma } from "@repo/database";

import { env } from "@/lib/env";

/** What the operator types before the reset runs. */
export const FULL_RESET_PHRASE = "RESET ALL DATA";

/**
 * The tables a reset leaves alone: the sign-in tables (so the people who can
 * reach this screen still can afterwards) and Prisma's own migration ledger
 * (so the schema is not re-applied). Everything else in `public` is emptied.
 * Names are the `@@map` names in schema.prisma.
 */
const KEPT_TABLES: ReadonlySet<string> = new Set([
  "users",
  "sessions",
  "accounts",
  "two_factors",
  "auth_rate_limits",
  "verifications",
  "_prisma_migrations",
]);

/** Off unless the deployment explicitly turns it on. */
export function fullResetEnabled(): boolean {
  return env?.ALLOW_FULL_RESET === "true";
}

/**
 * One person may reset: the SUPERADMIN whose email is `FULL_RESET_EMAIL`.
 * With the variable unset nobody may, so the feature cannot be reached by
 * adding a second SUPERADMIN.
 */
export function isFullResetOwner(user: { email?: string | null; role?: string | null } | null): boolean {
  const owner = env?.FULL_RESET_EMAIL?.trim().toLowerCase();
  if (!owner || !user?.email) return false;
  return user.role === "SUPERADMIN" && user.email.trim().toLowerCase() === owner;
}

/**
 * Empties every business table in one statement (atomic in Postgres). No
 * CASCADE on purpose: a kept table that referenced a wiped one would make the
 * statement fail rather than silently empty the sign-in tables.
 */
export async function wipeBusinessData(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const targets = rows.map((row) => row.tablename).filter((name) => !KEPT_TABLES.has(name));
  if (targets.length === 0) return [];
  const list = targets.map((name) => `"${name.replace(/"/g, '""')}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY`);
  return targets;
}
