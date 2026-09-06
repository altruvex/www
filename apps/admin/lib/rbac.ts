import type { Role } from "@/lib/nav";

/**
 * §24 — role-based access control.
 *
 * The database currently ships three roles (USER / ADMIN / SUPERADMIN) and the
 * proxy already gates the whole app to ADMIN and above. The product design
 * needs a finer set, so this file is the seam: the app reasons in PRODUCT roles
 * and this maps them onto whatever the schema happens to store today. When a
 * `role` column with the full set lands, only this file changes.
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
  | "integration";

const MATRIX: Record<Role, Partial<Record<Subject, Action[]>>> = {
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
  },
  SALES: {
    lead: ["view", "create", "edit"],
    client: ["view", "create", "edit"],
    proposal: ["view", "create", "edit", "send"],
    contract: ["view", "send"],
    project: ["view"],
    message: ["view", "create", "send"],
    meeting: ["view", "create", "edit", "approve"],
  },
  PM: {
    client: ["view"],
    project: ["view", "create", "edit"],
    contract: ["view"],
    message: ["view", "create", "send"],
    meeting: ["view", "create", "edit", "approve"],
  },
  FINANCE: {
    client: ["view"],
    contract: ["view"],
    project: ["view"],
    payment: ["view", "create", "edit", "export"],
  },
  VIEWER: {
    lead: ["view"],
    client: ["view"],
    proposal: ["view"],
    contract: ["view"],
    project: ["view"],
  },
};

export function can(role: Role | undefined, action: Action, subject: Subject): boolean {
  if (!role) return false;
  return MATRIX[role][subject]?.includes(action) ?? false;
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
