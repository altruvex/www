import type { Role } from "@/lib/nav";
import { can } from "@/lib/rbac";

/**
 * The rules a role change must pass, as a pure function so `verify:security`
 * can pin them without a database. Returns the refusal sentence, or `null`
 * when the change may go ahead.
 *
 *   - only a role that may edit the team (Owner) changes roles at all
 *   - only an Owner may grant Owner (the same rule today, kept explicit so a
 *     wider `team: edit` grant later does not widen it by accident)
 *   - you cannot change your own role — a demotion would lock you out of
 *     undoing it, a promotion would be self-granted
 *   - the last Owner cannot be demoted: nobody could manage people afterwards
 */
export function roleChangeRefusal(input: {
  actorId: string;
  actorRole: Role | undefined;
  targetId: string;
  targetRole: Role | undefined;
  next: Role;
  /** How many users currently resolve to Owner. */
  owners: number;
}): string | null {
  if (!can(input.actorRole, "edit", "team")) {
    return "Only an owner can change roles.";
  }
  if (input.actorId === input.targetId) {
    return "You cannot change your own role. Ask another owner.";
  }
  if (input.next === "OWNER" && input.actorRole !== "OWNER") {
    return "Only an owner can grant the Owner role.";
  }
  if (input.targetRole === input.next) {
    return "That is already their role.";
  }
  if (input.targetRole === "OWNER" && input.next !== "OWNER" && input.owners <= 1) {
    return "This is the last owner. Make someone else an owner first.";
  }
  return null;
}

/** The invoice prefix: upper-case letters, digits and hyphens, at most eight. */
export const INVOICE_PREFIX_PATTERN = /^[A-Z0-9-]{1,8}$/;
