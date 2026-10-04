import { createElement, type ReactElement } from "react";

import type { Role } from "@/lib/nav";
import type { Capability } from "@/lib/rbac";
import { pageDecision, rolesFor, ROUTE_GATES, type GatedRoute, type RouteGate } from "@/lib/route-gates";

export {
  NAV_WIDER_THAN_GATE,
  pageDecision,
  rolesFor,
  ROUTE_GATES,
  type GatedRoute,
  type RouteGate,
} from "@/lib/route-gates";

function toList(required: Capability | Capability[] | undefined): Capability[] {
  if (!required || required.length === 0) return [];
  return Array.isArray(required[0]) ? (required as Capability[]) : [required as Capability];
}

export async function gatePage(
  required?: Capability | Capability[],
  opts: { roles?: readonly Role[]; what?: string } = {},
): Promise<ReactElement | null> {
  const [{ getOperator }, { NoAccess }] = await Promise.all([
    import("@/lib/authorize"),
    import("@/components/os/no-access"),
  ]);
  const role = (await getOperator())?.role;
  if (pageDecision(role, required, opts.roles)) return null;
  return createElement(NoAccess, {
    role,
    required: toList(required),
    grantedTo: rolesFor({ required, roles: opts.roles ? [...opts.roles] : undefined }),
    what: opts.what,
  });
}

export function gateRoute(path: GatedRoute, what?: string): Promise<ReactElement | null> {
  const gate: RouteGate = ROUTE_GATES[path];
  return gatePage(gate.required, { roles: gate.roles, what });
}
