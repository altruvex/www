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
  payment: (id) => `/payments?inspect=${id}`,
  subscription: (id) => `/maintenance/${id}`,
  maintenance_request: () => "/maintenance",
  change_request: () => "/projects",
  incident: (id) => `/incidents/${id}`,
  deployment: (id) => `/deployments/${id}`,
  build: (id) => `/deployments/builds/${id}`,
  task: (id) => `/tasks?inspect=${id}`,
  meeting: (id) => `/calendar?meeting=${id}`,
  client_service: (id) => `/services?inspect=${id}`,
  user: () => "/team",
  settings: () => "/settings",
};

export function entityHref(type: string | null | undefined, id: string | null | undefined): string | null {
  const kind = normalizeEntityType(type);
  if (!kind || !id) return null;
  return PATH[kind]?.(id) ?? null;
}

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
