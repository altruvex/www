import type { Role } from "@/lib/nav";

/**
 * §24 — role-based access control.
 *
 * Two columns decide what an operator may do. `User.role` (USER / ADMIN /
 * SUPERADMIN) is the auth role: the proxy and the dashboard layout gate the
 * whole app to ADMIN and above with it. `User.opsRole` is the product role
 * this file reasons in; when it is NULL the product role is derived from the
 * auth role (SUPERADMIN → Owner, ADMIN → Admin), so an account that predates
 * the column keeps exactly the access it had. `opsRole` only narrows what a
 * signed-in operator may do — it can never let a non-admin in.
 */
export function toProductRole(dbRole: string | null | undefined): Role | undefined {
  switch (dbRole) {
    case "SUPERADMIN":
      return "OWNER";
    case "ADMIN":
      return "ADMIN";
    default:
      return undefined;
  }
}

export const ROLES: Role[] = ["OWNER", "ADMIN", "SALES", "PM", "FINANCE", "VIEWER"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/**
 * The product role of a user row: `opsRole` when it is set to a known role,
 * otherwise derived from the auth role. A `USER` with no opsRole resolves to
 * nothing, and `can()` refuses everything for nothing.
 */
export function resolveRole(user: {
  role?: string | null;
  opsRole?: string | null;
}): Role | undefined {
  if (isRole(user.opsRole)) return user.opsRole;
  return toProductRole(user.role);
}

export type Action = "view" | "create" | "edit" | "delete" | "approve" | "send" | "export";

export type Subject =
  | "lead"
  | "client"
  | "proposal"
  | "contract"
  | "project"
  | "payment"
  | "message"
  | "meeting"
  | "settings"
  | "team"
  | "integration"
  // Engineering operations. Incidents are opened and worked by people;
  // builds, deployments and logs are written only by CI (`/api/ingest/*`),
  // so the only capability a person holds on them is `view` — the ingest
  // routes authenticate with a product token, never with a role.
  | "incident"
  | "deployment"
  | "build"
  | "log"
  // Conversation, not company data. A note on a client or on a website lead
  // belongs to whoever wrote it in the way a client record does not, so it
  // carries its own subject instead of borrowing `lead` or `client`: the
  // people who write notes may take them back without holding the owner-only
  // right to delete a client and its whole history.
  | "note"
  // The signed-in person's own inbox. Every role may clear it; the delete
  // registry scopes each row to its recipient (`lib/deletable.ts`).
  | "notification";

/** The matrix itself is exported for the /team grid and the verify script; decisions go through `can`. */
export const MATRIX: Record<Role, Partial<Record<Subject, Action[]>>> = {
  OWNER: {
    lead: ["view", "create", "edit", "delete", "export"],
    client: ["view", "create", "edit", "delete", "export"],
    proposal: ["view", "create", "edit", "delete", "approve", "send", "export"],
    contract: ["view", "create", "edit", "delete", "approve", "send", "export"],
    project: ["view", "create", "edit", "delete", "export"],
    payment: ["view", "create", "edit", "delete", "export"],
    message: ["view", "create", "send"],
    meeting: ["view", "create", "edit", "delete", "approve"],
    settings: ["view", "edit"],
    team: ["view", "create", "edit", "delete"],
    integration: ["view", "edit"],
    incident: ["view", "create", "edit", "delete"],
    deployment: ["view"],
    build: ["view"],
    log: ["view"],
    note: ["view", "create", "edit", "delete"],
    notification: ["view", "delete"],
  },
  ADMIN: {
    lead: ["view", "create", "edit", "delete", "export"],
    client: ["view", "create", "edit", "export"],
    proposal: ["view", "create", "edit", "approve", "send", "export"],
    contract: ["view", "create", "edit", "approve", "send", "export"],
    project: ["view", "create", "edit", "export"],
    payment: ["view", "create", "edit", "export"],
    message: ["view", "create", "send"],
    meeting: ["view", "create", "edit", "approve"],
    settings: ["view", "edit"],
    team: ["view"],
    integration: ["view", "edit"],
    incident: ["view", "create", "edit", "delete"],
    deployment: ["view"],
    build: ["view"],
    log: ["view"],
    note: ["view", "create", "edit", "delete"],
    notification: ["view", "delete"],
  },
  SALES: {
    lead: ["view", "create", "edit"],
    client: ["view", "create", "edit"],
    proposal: ["view", "create", "edit", "send"],
    contract: ["view", "send"],
    project: ["view"],
    message: ["view", "create", "send"],
    meeting: ["view", "create", "edit", "approve"],
    note: ["view", "create", "edit", "delete"],
    notification: ["view", "delete"],
  },
  PM: {
    client: ["view"],
    project: ["view", "create", "edit"],
    contract: ["view"],
    message: ["view", "create", "send"],
    meeting: ["view", "create", "edit", "approve"],
    incident: ["view", "create", "edit"],
    deployment: ["view"],
    build: ["view"],
    log: ["view"],
    note: ["view"],
    notification: ["view", "delete"],
  },
  FINANCE: {
    client: ["view"],
    contract: ["view"],
    project: ["view"],
    payment: ["view", "create", "edit", "export"],
    notification: ["view", "delete"],
  },
  VIEWER: {
    lead: ["view"],
    client: ["view"],
    proposal: ["view"],
    contract: ["view"],
    project: ["view"],
    incident: ["view"],
    deployment: ["view"],
    build: ["view"],
    log: ["view"],
    note: ["view"],
    notification: ["view", "delete"],
  },
};

export function can(role: Role | undefined, action: Action, subject: Subject): boolean {
  if (!role) return false;
  return MATRIX[role][subject]?.includes(action) ?? false;
}

/** One capability, or several that must all hold. */
export type Capability = [Action, Subject];

/**
 * `true` when the role holds every capability in the list. Pure, so the
 * route wrapper's 403 decision can be pinned by `verify:security` without a
 * session or a database.
 */
export function permitted(
  role: Role | undefined,
  required: Capability | Capability[] | undefined,
): boolean {
  if (!required || required.length === 0) return true;
  const list: Capability[] = Array.isArray(required[0])
    ? (required as Capability[])
    : [required as Capability];
  return list.every(([action, subject]) => can(role, action, subject));
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  SALES: "Sales",
  PM: "Project manager",
  FINANCE: "Finance",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Everything, including deleting records and managing people.",
  ADMIN: "Everything operational. Cannot remove team members.",
  SALES: "Leads, clients, proposals and messaging. No financial records.",
  PM: "Delivery only: projects, phases, client communication.",
  FINANCE: "Payments and financial export. Read-only everywhere else.",
  VIEWER: "Read-only across the pipeline. Cannot send or edit anything.",
};

export const SUBJECTS: Subject[] = [
  "lead",
  "client",
  "proposal",
  "contract",
  "project",
  "payment",
  "message",
  "meeting",
  "settings",
  "team",
  "integration",
  "incident",
  "deployment",
  "build",
  "log",
  "note",
  "notification",
];

export const ACTIONS: Action[] = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "send",
  "export",
];
