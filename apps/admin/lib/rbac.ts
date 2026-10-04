import type { Role } from "@/lib/nav";

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
  | "incident"
  | "deployment"
  | "build"
  | "log"
  | "note"
  | "notification";

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

export type Capability = [Action, Subject];

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
  ADMIN: "Everything operational. Cannot manage the team or delete records.",
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
