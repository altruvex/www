import type { Role } from "@/lib/nav";
import { can } from "@/lib/rbac";

export function roleChangeRefusal(input: {
  actorId: string;
  actorRole: Role | undefined;
  targetId: string;
  targetRole: Role | undefined;
  next: Role;
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

export const INVOICE_PREFIX_PATTERN = /^[A-Z0-9-]{1,8}$/;
