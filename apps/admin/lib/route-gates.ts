import type { Role } from "@/lib/nav";
import { permitted, ROLES, type Capability } from "@/lib/rbac";

export interface RouteGate {
  required?: Capability | Capability[];
  roles?: Role[];
}

const FINANCE_ROLES: Role[] = ["OWNER", "ADMIN", "FINANCE"];
const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export const ROUTE_GATES = {
  "/": {},
  "/actions": {},
  "/notifications": { required: ["view", "notification"] },
  "/automations": {},

  "/inbox": { required: ["view", "message"] },
  "/whatsapp": { required: ["view", "message"] },
  "/whatsapp/[clientId]": { required: ["view", "message"] },
  "/email": { required: ["view", "message"] },
  "/calendar": { required: ["view", "meeting"] },
  "/meetings": { required: ["view", "meeting"] },

  "/leads": { required: ["view", "lead"] },
  "/submissions": { required: ["view", "lead"] },
  "/submissions/[id]": { required: ["view", "lead"] },
  "/transparency": { required: ["view", "lead"] },
  "/pipeline": { required: ["view", "client"] },
  "/clients": { required: ["view", "client"] },
  "/clients/new": { required: ["create", "client"] },
  "/clients/[id]": { required: ["view", "client"] },
  "/clients/[id]/edit": { required: ["edit", "client"] },
  "/clients/[id]/new-proposal": { required: ["create", "proposal"] },
  "/proposals": { required: ["view", "proposal"] },
  "/proposals/[id]": { required: ["view", "proposal"] },
  "/contracts": { required: ["view", "contract"] },
  "/contracts/[id]": { required: ["view", "contract"] },
  "/documents": { required: ["view", "contract"] },

  "/projects": { required: ["view", "project"] },
  "/projects/[id]": { required: ["view", "project"] },
  "/tasks": { required: ["view", "project"] },
  "/maintenance": { required: ["view", "project"] },
  "/maintenance/[id]": { required: ["view", "project"] },
  "/services": { required: ["view", "client"] },

  "/products": { required: ["view", "deployment"] },
  "/products/[id]": { required: ["view", "deployment"] },
  "/deployments": { required: ["view", "deployment"] },
  "/deployments/[id]": { required: ["view", "deployment"] },
  "/deployments/builds/[id]": { required: ["view", "build"] },
  "/logs": { required: ["view", "log"] },
  "/health": { required: ["view", "deployment"] },
  "/incidents": { required: ["view", "incident"] },
  "/incidents/[id]": { required: ["view", "incident"] },

  "/renewals": { required: ["view", "payment"], roles: FINANCE_ROLES },
  "/payments": { required: ["view", "payment"], roles: FINANCE_ROLES },
  "/invoices": { required: ["view", "payment"], roles: FINANCE_ROLES },
  "/pricing": { required: ["view", "payment"], roles: FINANCE_ROLES },
  "/analytics": { required: ["view", "client"] },

  "/audit": { required: ["view", "settings"], roles: ADMIN_ROLES },
  "/activity": { required: ["view", "settings"], roles: ADMIN_ROLES },
  "/integrations": { required: ["view", "integration"], roles: ADMIN_ROLES },
  "/team": { required: ["view", "team"], roles: ADMIN_ROLES },
  "/settings": { required: ["view", "settings"], roles: ADMIN_ROLES },
} satisfies Record<string, RouteGate>;

export type GatedRoute = keyof typeof ROUTE_GATES;

export const NAV_WIDER_THAN_GATE: readonly GatedRoute[] = [];

export function pageDecision(
  role: Role | undefined,
  required?: Capability | Capability[],
  roles?: readonly Role[],
): boolean {
  if (!role) return false;
  if (roles && roles.length > 0 && !roles.includes(role)) return false;
  return permitted(role, required);
}

export function rolesFor(gate: RouteGate): Role[] {
  return ROLES.filter((role) => pageDecision(role, gate.required, gate.roles));
}

