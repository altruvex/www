/**
 * Where every record lives in this application — the one map.
 *
 * Audit events, notifications, Slack messages, search results and every
 * "related record" cell resolve a record to its page through `entityHref`, so a
 * new detail route is added here once and every surface links to it.
 *
 * Writers are not consistent about the type string: the audit trail uses
 * lower camel or snake case ("changeRequest", "client_service"), notifications
 * written by the marketing site use Prisma model names ("ContactSubmission")
 * or short words ("contact"). `normalizeEntityType` folds all of them onto one
 * key, so a link never breaks because two writers spelled a type differently.
 */

export type EntityKind =
  | "client"
  | "submission"
  | "transparency_lead"
  | "proposal"
  | "contract"
  | "project"
  | "product"
  | "payment"
  | "subscription"
  | "maintenance_request"
  | "change_request"
  | "incident"
  | "deployment"
  | "build"
  | "task"
  | "meeting"
  | "client_service"
  | "user"
  | "settings";

const ALIASES: Record<string, EntityKind> = {
  client: "client",
  submission: "submission",
  contact: "submission",
  contactsubmission: "submission",
  lead: "submission",
  transparencylead: "transparency_lead",
  proposal: "proposal",
  contract: "contract",
  project: "project",
  product: "product",
  site: "product",
  payment: "payment",
  subscription: "subscription",
  maintenancesubscription: "subscription",
  retainer: "subscription",
  maintenancerequest: "maintenance_request",
  changerequest: "change_request",
  incident: "incident",
  deployment: "deployment",
  deploy: "deployment",
  build: "build",
  task: "task",
  projecttask: "task",
  meeting: "meeting",
  clientservice: "client_service",
  service: "client_service",
  user: "user",
  settings: "settings",
  companysettings: "settings",
};

/** Folds "ClientService", "client_service" and "clientService" onto one key. */
export function normalizeEntityType(type: string | null | undefined): EntityKind | null {
  if (!type) return null;
  return ALIASES[type.replace(/[_\-\s]/g, "").toLowerCase()] ?? null;
}

const PATH: Record<EntityKind, ((id: string) => string) | null> = {
  client: (id) => `/clients/${id}`,
  submission: (id) => `/submissions/${id}`,
  transparency_lead: (id) => `/transparency?lead=${id}`,
  proposal: (id) => `/proposals/${id}`,
  contract: (id) => `/contracts/${id}`,
  project: (id) => `/projects/${id}`,
  product: (id) => `/products/${id}`,
  payment: (id) => `/payments?payment=${id}`,
  subscription: (id) => `/maintenance/${id}`,
  maintenance_request: () => "/maintenance",
  change_request: () => "/projects",
  incident: (id) => `/incidents/${id}`,
  deployment: (id) => `/deployments/${id}`,
  build: (id) => `/deployments/builds/${id}`,
  task: (id) => `/tasks?task=${id}`,
  meeting: (id) => `/calendar?meeting=${id}`,
  client_service: (id) => `/services#service-${id}`,
  user: () => "/team",
  settings: () => "/settings",
};

/** The in-app path for a record, or null when the type has no page. */
export function entityHref(type: string | null | undefined, id: string | null | undefined): string | null {
  const kind = normalizeEntityType(type);
  if (!kind || !id) return null;
  return PATH[kind]?.(id) ?? null;
}

/** The singular noun shown before a label ("Contract · ACME-2026-01"). */
export const ENTITY_NOUN: Record<EntityKind, string> = {
  client: "Client",
  submission: "Lead",
  transparency_lead: "Estimate lead",
  proposal: "Proposal",
  contract: "Contract",
  project: "Project",
  product: "Product",
  payment: "Payment",
  subscription: "Retainer",
  maintenance_request: "Maintenance request",
  change_request: "Change request",
  incident: "Incident",
  deployment: "Deployment",
  build: "Build",
  task: "Task",
  meeting: "Meeting",
  client_service: "Service",
  user: "Team member",
  settings: "Settings",
};

export function entityNoun(type: string | null | undefined): string {
  const kind = normalizeEntityType(type);
  return kind ? ENTITY_NOUN[kind] : (type ?? "Record");
}
