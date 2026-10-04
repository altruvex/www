import { roleCanOpen } from "@/lib/action-center";
import { canSeeFinance, type Role } from "@/lib/nav";
import { can } from "@/lib/rbac";
import type { ContractStepPermissions } from "./contract-steps";

export function contractStepPermissions(
  role: Role | undefined,
): ContractStepPermissions {
  return {
    openProject: roleCanOpen(role, "/projects"),
    addTask: can(role, "create", "project") && roleCanOpen(role, "/tasks"),
    charge:
      canSeeFinance(role) &&
      can(role, "create", "payment") &&
      roleCanOpen(role, "/payments"),
    quote: can(role, "create", "proposal") && roleCanOpen(role, "/clients"),
  };
}
