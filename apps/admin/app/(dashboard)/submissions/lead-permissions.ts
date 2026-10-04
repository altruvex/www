import { roleCanOpen } from "@/lib/action-center";
import type { Role } from "@/lib/nav";
import { can } from "@/lib/rbac";

export function leadStepPermissions(role: Role | undefined) {
  const openClient = roleCanOpen(role, "/clients");
  return {
    openClient,
    propose: openClient && can(role, "create", "proposal"),
    schedule: roleCanOpen(role, "/calendar") && can(role, "create", "meeting"),
  };
}
