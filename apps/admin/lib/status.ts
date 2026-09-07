/**
 * The status registry — one place, six tones.
 *
 * Design law (docs/admin-os-design-brief.md): every enum in the Prisma schema
 * maps into exactly ONE of six semantic tones. A seventh colour, or the same
 * enum rendered two different ways on two different screens, is a design bug.
 * Screens never write `bg-success/10` by hand; they call `statusOf()`.
 *
 * Tone meanings — these are about WHAT THE OPERATOR MUST DO, not about mood:
 *   neutral   inert. Nothing is happening and nothing should.
 *   info      in flight, on the happy path, no human needed.
 *   progress  actively being worked by someone.
 *   warning   a human needs to act soon, or this will go wrong.
 *   danger    already wrong: failed, lost, overdue, rejected.
 *   success   terminal-good: won, signed, paid, launched.
 */

export type Tone =
  | "neutral"
  | "info"
  | "progress"
  | "warning"
  | "danger"
  | "success";

export interface StatusDef {
  label: string;
  tone: Tone;
  /** Short operator-facing gloss, shown in tooltips and the action centre. */
  hint?: string;
}

/** Tailwind classes per tone. The only place tone becomes colour. */
export const toneClasses: Record<Tone, string> = {
  neutral: "text-neutral border-neutral/25 bg-neutral/10",
  info: "text-info border-info/25 bg-info/10",
  progress: "text-progress border-progress/25 bg-progress/10",
  warning: "text-warning border-warning/25 bg-warning/10",
  danger: "text-danger border-danger/25 bg-danger/10",
  success: "text-success border-success/25 bg-success/10",
};

/** Solid dot colour, for dense rows where a pill is too heavy. */
export const toneDot: Record<Tone, string> = {
  neutral: "bg-neutral",
  info: "bg-info",
  progress: "bg-progress",
  warning: "bg-warning",
  danger: "bg-danger",
  success: "bg-success",
};

/** Icon-only tone. Static class strings — Tailwind cannot see `text-${tone}`. */
export const toneIcon: Record<Tone, string> = {
  neutral: "text-neutral",
  info: "text-info",
  progress: "text-progress",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};

/** Text-only tone, for numerals in stat tiles. */
export const toneText: Record<Tone, string> = {
  neutral: "text-foreground",
  info: "text-info",
  progress: "text-progress",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};

type Registry = Record<string, StatusDef>;

export const submissionStatus: Registry = {
  NEW: { label: "New", tone: "info", hint: "Nobody has looked at this yet" },
  VIEWED: { label: "Viewed", tone: "neutral", hint: "Seen, not yet contacted" },
  CONTACTED: { label: "Contacted", tone: "progress" },
  QUALIFIED: { label: "Qualified", tone: "progress", hint: "Real opportunity" },
  PROPOSAL_SENT: { label: "Proposal sent", tone: "warning", hint: "Waiting on the client" },
  WON: { label: "Won", tone: "success" },
  LOST: { label: "Lost", tone: "danger" },
  SPAM: { label: "Spam", tone: "neutral" },
};

export const priority: Registry = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};

export const proposalStatus: Registry = {
  DRAFT: { label: "Draft", tone: "neutral", hint: "Not sent to anyone" },
  SENT: { label: "Sent", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "info", hint: "Reached the device" },
  READ: { label: "Read", tone: "progress", hint: "Client opened the message" },
  VIEWED: { label: "Viewed", tone: "progress", hint: "Client opened the deck" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "warning", hint: "Past its validity date" },
};

export const contractStatus: Registry = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Awaiting signature", tone: "warning" },
  SIGNED: { label: "Signed", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "warning" },
};

export const projectStatus: Registry = {
  ACTIVE: { label: "Active", tone: "progress" },
  ON_HOLD: { label: "On hold", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const projectPhase: Registry = {
  DISCOVERY: { label: "Discovery", tone: "info" },
  DESIGN: { label: "Design", tone: "info" },
  DEVELOPMENT: { label: "Development", tone: "progress" },
  QA: { label: "QA", tone: "progress" },
  STAGING_REVIEW: { label: "Staging review", tone: "warning", hint: "Waiting on client sign-off" },
  LAUNCHED: { label: "Launched", tone: "success" },
  POST_LAUNCH_SUPPORT: { label: "Support", tone: "success" },
};

export const PROJECT_PHASE_ORDER = [
  "DISCOVERY",
  "DESIGN",
  "DEVELOPMENT",
  "QA",
  "STAGING_REVIEW",
  "LAUNCHED",
  "POST_LAUNCH_SUPPORT",
] as const;

export const paymentStatus: Registry = {
  PENDING: { label: "Pending", tone: "info" },
  PAID: { label: "Paid", tone: "success" },
  OVERDUE: { label: "Overdue", tone: "danger" },
  WAIVED: { label: "Waived", tone: "neutral" },
};

export const paymentMilestone: Registry = {
  DEPOSIT_50: { label: "Deposit · 50%", tone: "info" },
  MILESTONE_30: { label: "Milestone · 30%", tone: "info" },
  FINAL_20: { label: "Final · 20%", tone: "info" },
  OTHER: { label: "Other", tone: "neutral" },
};

export const meetingStatus: Registry = {
  PENDING: { label: "Awaiting approval", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  REJECTED: { label: "Rejected", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  RESCHEDULED: { label: "Rescheduled", tone: "warning" },
};

export const meetingType: Registry = {
  DISCOVERY: { label: "Discovery", tone: "info" },
  CONSULTATION: { label: "Consultation", tone: "info" },
  PROPOSAL: { label: "Proposal", tone: "progress" },
  FOLLOWUP: { label: "Follow-up", tone: "neutral" },
};

export const clientSource: Registry = {
  WEBSITE_CONTACT_FORM: { label: "Contact form", tone: "info" },
  TRANSPARENCY_ESTIMATOR: { label: "Estimator", tone: "progress" },
  MANUAL: { label: "Added manually", tone: "neutral" },
  WHATSAPP_INBOUND: { label: "WhatsApp", tone: "success" },
  REFERRAL: { label: "Referral", tone: "warning" },
};

export const whatsappStatus: Registry = {
  QUEUED: { label: "Queued", tone: "neutral" },
  SENT: { label: "Sent", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "info" },
  READ: { label: "Read", tone: "progress" },
  FAILED: { label: "Failed", tone: "danger" },
};

export const serviceType: Registry = {
  WEB_DEVELOPMENT: { label: "Web development", tone: "neutral" },
  ECOMMERCE: { label: "E-commerce", tone: "neutral" },
  MULTILINGUAL: { label: "Multilingual", tone: "neutral" },
  UI_UX: { label: "UI / UX", tone: "neutral" },
  OTHER: { label: "Other", tone: "neutral" },
};

export const projectTimelineLabels: Registry = {
  IMMEDIATE: { label: "Immediate", tone: "danger" },
  SOON: { label: "Soon", tone: "warning" },
  PLANNING: { label: "Planning", tone: "info" },
  EXPLORING: { label: "Exploring", tone: "neutral" },
};

export const budgetRange: Registry = {
  UNDER_10K: { label: "Under 10k", tone: "neutral" },
  B_10K_25K: { label: "10k – 25k", tone: "info" },
  B_25K_50K: { label: "25k – 50k", tone: "progress" },
  OVER_50K: { label: "Over 50k", tone: "success" },
};

/**
 * The derived client pipeline stage. This is not a database column — it is
 * computed in lib/pipeline.ts from the client's furthest-along artifact
 * (signed contract beats sent contract beats read proposal beats status).
 */
export const pipelineStage: Registry = {
  NEW: { label: "New", tone: "info" },
  VIEWED: { label: "Viewed", tone: "neutral" },
  CONTACTED: { label: "Contacted", tone: "progress" },
  QUALIFIED: { label: "Qualified", tone: "progress" },
  PROPOSAL_SENT: { label: "Proposal sent", tone: "warning" },
  PROPOSAL_READ: { label: "Proposal read", tone: "warning" },
  CONTRACT_SENT: { label: "Contract sent", tone: "warning" },
  SIGNED: { label: "Signed", tone: "success" },
  LOST: { label: "Lost", tone: "danger" },
  SPAM: { label: "Spam", tone: "neutral" },
};

/* -- Engineering operations ------------------------------------------------
   Tone here follows the same rule as everywhere else: it describes what the
   operator must DO, not how the event feels. A failed build is `danger`
   because someone has to fix it; a queued one is `neutral` because nobody
   should touch it yet. */

export const productStatus: Registry = {
  PLANNED: { label: "Planned", tone: "neutral", hint: "Agreed, not started" },
  IN_DEVELOPMENT: { label: "In development", tone: "progress" },
  LIVE: { label: "Live", tone: "success", hint: "Serving production traffic" },
  MAINTENANCE: { label: "Maintenance", tone: "info", hint: "Live and under retainer" },
  SUNSET: { label: "Sunset", tone: "neutral", hint: "Retired, kept for the record" },
};

export const productKind: Registry = {
  WEBSITE: { label: "Website", tone: "neutral" },
  WEB_APP: { label: "Web app", tone: "neutral" },
  API: { label: "API", tone: "neutral" },
  ECOMMERCE: { label: "E-commerce", tone: "neutral" },
  LANDING_PAGE: { label: "Landing page", tone: "neutral" },
  INTERNAL_TOOL: { label: "Internal tool", tone: "neutral" },
};

export const deployEnvironment: Registry = {
  PRODUCTION: { label: "Production", tone: "warning", hint: "Real users are on this" },
  STAGING: { label: "Staging", tone: "info" },
  PREVIEW: { label: "Preview", tone: "neutral" },
};

export const buildStatus: Registry = {
  QUEUED: { label: "Queued", tone: "neutral" },
  RUNNING: { label: "Running", tone: "progress" },
  SUCCEEDED: { label: "Succeeded", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const deploymentStatus: Registry = {
  PENDING: { label: "Pending", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "progress" },
  SUCCEEDED: { label: "Succeeded", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  ROLLED_BACK: { label: "Rolled back", tone: "warning", hint: "Replaced by a later deploy" },
};

export const logLevel: Registry = {
  DEBUG: { label: "Debug", tone: "neutral" },
  INFO: { label: "Info", tone: "info" },
  WARN: { label: "Warn", tone: "warning" },
  ERROR: { label: "Error", tone: "danger" },
  FATAL: { label: "Fatal", tone: "danger" },
};

export const incidentSeverity: Registry = {
  SEV1: { label: "SEV1", tone: "danger", hint: "Down or unusable for everyone" },
  SEV2: { label: "SEV2", tone: "danger", hint: "Major function broken" },
  SEV3: { label: "SEV3", tone: "warning", hint: "Degraded, with a workaround" },
  SEV4: { label: "SEV4", tone: "info", hint: "Minor, no client impact" },
};

export const incidentStatus: Registry = {
  INVESTIGATING: { label: "Investigating", tone: "danger", hint: "Cause not yet known" },
  IDENTIFIED: { label: "Identified", tone: "warning", hint: "Cause known, fix pending" },
  MONITORING: { label: "Monitoring", tone: "progress", hint: "Fix applied, watching" },
  RESOLVED: { label: "Resolved", tone: "success" },
};

export const taskStatus: Registry = {
  TODO: { label: "To do", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "progress" },
  BLOCKED: { label: "Blocked", tone: "danger", hint: "Someone else has to move first" },
  DONE: { label: "Done", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

/* -- Subscription lifecycle -------------------------------------------------
   Mirrors STATUS_TONE in lib/subscription-lifecycle.ts. That module is
   isomorphic (it has no Tailwind and no registry) and this one is the single
   place tone becomes colour, so the two are kept deliberately in step. */

export const subscriptionStatus: Registry = {
  TRIALING: { label: "Trial", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  PAST_DUE: { label: "Past due", tone: "warning", hint: "Renewal date passed unpaid" },
  GRACE: { label: "Grace period", tone: "danger", hint: "Overdue — decide whether to suspend" },
  SUSPENDED: { label: "Suspended", tone: "danger", hint: "Service stopped by Altruvex" },
  PAUSED: { label: "Paused", tone: "neutral", hint: "Halted at the client's request" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral", hint: "Ran out without renewing" },
};

export const renewalUrgency: Registry = {
  overdue: { label: "Overdue", tone: "danger" },
  "due-soon": { label: "Due soon", tone: "warning" },
  ending: { label: "Not renewing", tone: "warning", hint: "Auto-renew is off" },
  scheduled: { label: "Scheduled", tone: "neutral" },
  none: { label: "—", tone: "neutral" },
};

export const REGISTRIES = {
  submissionStatus,
  priority,
  proposalStatus,
  contractStatus,
  projectStatus,
  projectPhase,
  paymentStatus,
  paymentMilestone,
  meetingStatus,
  meetingType,
  clientSource,
  whatsappStatus,
  serviceType,
  projectTimeline: projectTimelineLabels,
  budgetRange,
  pipelineStage,
  productStatus,
  productKind,
  deployEnvironment,
  buildStatus,
  deploymentStatus,
  logLevel,
  incidentSeverity,
  incidentStatus,
  taskStatus,
  subscriptionStatus,
  renewalUrgency,
} as const;

export type RegistryName = keyof typeof REGISTRIES;

const FALLBACK: StatusDef = { label: "Unknown", tone: "neutral" };

/**
 * Resolve a raw enum value to its status definition. Unknown values degrade to
 * a readable title-cased label rather than rendering the raw SCREAMING_CASE —
 * a new enum member added to the schema will look plain, never broken.
 */
export function statusOf(registry: RegistryName, value?: string | null): StatusDef {
  if (!value) return FALLBACK;
  const found = REGISTRIES[registry][value];
  if (found) return found;
  return { label: titleCase(value), tone: "neutral" };
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Options for a <select>/filter built straight off a registry. */
export function optionsOf(registry: RegistryName) {
  return Object.entries(REGISTRIES[registry]).map(([value, def]) => ({
    value,
    label: def.label,
    tone: def.tone,
  }));
}
