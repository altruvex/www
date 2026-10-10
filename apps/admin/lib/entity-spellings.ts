// Audit entityType spellings per entity kind. A leaf module: dashboard-data
// reads it, and importing it from entity-audit.tsx pulled action-center and
// sales-signals into a cycle that broke module evaluation in the build.
export const SPELLINGS: Record<string, string[]> = {
  client: ["client", "Client"],
  submission: ["submission", "contact", "ContactSubmission"],
  proposal: ["proposal", "Proposal"],
  contract: ["contract", "Contract"],
  project: ["project", "Project"],
  product: ["product", "Product"],
  payment: ["payment", "Payment"],
  subscription: ["subscription", "maintenance_subscription", "MaintenanceSubscription"],
  incident: ["incident", "Incident"],
  deployment: ["deployment", "Deployment"],
  build: ["build", "Build"],
  task: ["task", "ProjectTask"],
  meeting: ["meeting", "Meeting"],
  client_service: ["client_service", "ClientService", "clientService"],
  change_request: ["changeRequest", "change_request", "ChangeRequest"],
  user: ["user", "User"],
};
