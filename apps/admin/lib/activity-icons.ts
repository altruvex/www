import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlarmClock,
  ArrowRightLeft,
  Ban,
  Banknote,
  Bell,
  BellRing,
  Building2,
  Boxes,
  CalendarCheck,
  CalendarClock,
  CalendarCog,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  CheckCheck,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileCheck2,
  FileClock,
  FilePlus2,
  TimerReset,
  FileSignature,
  FileText,
  FileX2,
  Flag,
  FlaskConical,
  FolderCheck,
  FolderOpen,
  FolderPen,
  FolderPlus,
  History,
  Gauge,
  GitPullRequest,
  GitPullRequestClosed,
  Hammer,
  Hash,
  Hourglass,
  KeyRound,
  Layers,
  Link2,
  ListChecks,
  ListPlus,
  LogIn,
  LogOut,
  Mail,
  MailOpen,
  Milestone,
  MonitorOff,
  MonitorX,
  NotebookPen,
  Package,
  PackageCheck,
  PackagePlus,
  Pause,
  Pencil,
  Pin,
  PinOff,
  Play,
  Plus,
  Power,
  Receipt,
  RefreshCw,
  Repeat,
  Rocket,
  RotateCcw,
  Send,
  Server,
  ServerCog,
  Settings2,
  Shapes,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  ShieldX,
  Siren,
  StickyNote,
  Tags,
  Target,
  Terminal,
  Trash2,
  Undo2,
  Unlink2,
  UserCheck,
  UserCog,
  UserPen,
  UserPlus,
  UserRoundPlus,
  Wallet,
  Wrench,
} from "lucide-react";

import { normalizeEntityType, type EntityKind } from "@/lib/entity-links";
import type { Tone } from "@/lib/status";

const ACTION_ICONS = {
  "auth.signed_in": LogIn,
  "auth.signed_out": LogOut,
  "auth.sign_in_failed": ShieldX,

  "client.created": UserPlus,
  "client.updated": UserPen,
  "client.stage_moved": ArrowRightLeft,
  "client.status_changed": Flag,
  "client.lead_record_updated": UserCheck,
  "client.call_outcome_applied": ArrowRightLeft,
  "client.priority_changed": Gauge,
  "client.note_added": StickyNote,
  "client.note_edited": NotebookPen,
  "client.note_pinned": Pin,
  "client.note_unpinned": PinOff,
  "client.submission_linked": Link2,
  "client.estimate_linked": Link2,
  "client.deleted": Trash2,
  "clientNote.deleted": Trash2,
  "note.deleted": Trash2,

  "submission.viewed": Eye,
  "submission.note_added": StickyNote,
  "submission.status_changed": Flag,
  "submission.priority_changed": Gauge,
  "submission.assigned": UserCheck,
  "submission.deleted": Trash2,
  "transparencyLead.deleted": Trash2,

  "proposal.created": FilePlus2,
  "proposal.sent": Send,
  "proposal.accepted": FileCheck2,
  "proposal.rejected": FileX2,
  "proposal.expired": FileClock,
  "proposal.validity_extended": TimerReset,
  "proposal.reverted_to_draft": Undo2,
  "proposal.deleted": Trash2,

  "contract.created": FilePlus2,
  "contract.sent": Send,
  "contract.signed": FileSignature,
  "contract.declined": FileX2,
  "contract.expired": FileClock,
  "contract.reverted_to_draft": Undo2,
  "contract.signer_updated": UserPen,
  "contract.onboarding_recorded": ClipboardCheck,
  "contract.deleted": Trash2,

  "project.created": FolderPlus,
  "project.recorded": History,
  "project.updated": FolderPen,
  "project.status_changed": Flag,
  "project.phase_changed": Milestone,
  "project.completed": FolderCheck,
  "project.deleted": Trash2,
  "task.created": ListPlus,
  "task.updated": ListChecks,
  "task.deleted": Trash2,
  "change_request.created": GitPullRequest,
  "change_request.quoted": Tags,
  "change_request.requoted": RotateCcw,
  "change_request.quote_sent": Send,
  "change_request.approved": CircleCheck,
  "change_request.declined": GitPullRequestClosed,
  "change_request.started": Play,
  "change_request.delivered": PackageCheck,
  "change_request.cancelled": Ban,
  "change_request.warranty": ShieldCheck,

  "subscription.created": Repeat,
  "subscription.renewed": Repeat,
  "subscription.plan_changed": Layers,
  "subscription.quote_changed": Tags,
  "subscription.billing_interval_changed": CalendarClock,
  "subscription.auto_renew_changed": RefreshCw,
  "subscription.invoice_recorded": Receipt,
  "subscription.trialing": FlaskConical,
  "subscription.active": Play,
  "subscription.past_due": AlarmClock,
  "subscription.grace": Hourglass,
  "subscription.suspended": Ban,
  "subscription.paused": Pause,
  "subscription.cancelled": Ban,
  "subscription.expired": CalendarX2,
  "maintenanceSubscription.deleted": Trash2,
  "maintenance_request.status_changed": Wrench,
  "maintenance_request.billing_changed": Receipt,
  "maintenanceRequest.deleted": Trash2,

  "service.created": Server,
  "service.updated": ServerCog,
  "service.renewed": Repeat,
  "service.renewal_due": AlarmClock,
  "service.reminder_sent": BellRing,
  "service.activated": Power,
  "service.reactivated": Power,
  "service.cancelled": Ban,
  "service.expiry_synced": RefreshCw,
  "service.expiry_corrected": CalendarCog,
  "clientService.deleted": Trash2,

  "product.created": PackagePlus,
  "product.updated": Package,
  "product.token_rotated": KeyRound,
  "product.token_revoked": ShieldOff,
  "product.deleted": Trash2,
  "build.queued": Hourglass,
  "build.running": Hammer,
  "build.succeeded": Hammer,
  "build.failed": Hammer,
  "build.cancelled": Ban,
  "build.deleted": Trash2,
  "deployment.pending": Hourglass,
  "deployment.in_progress": Rocket,
  "deployment.succeeded": Rocket,
  "deployment.failed": Rocket,
  "deployment.rolled_back": Undo2,
  "deployment.deleted": Trash2,
  "log.deleted": Trash2,
  "incident.opened": Siren,
  "incident.updated": ShieldAlert,
  "incident.changed": ShieldAlert,
  "incident.resolved": ShieldCheck,
  "incident.reopened": RotateCcw,
  "incident.log_linked": Link2,
  "incident.log_unlinked": Unlink2,
  "incident.deleted": Trash2,

  "payment.created": Wallet,
  "payment.recorded": Banknote,
  "payment.status_changed": CreditCard,
  "payment.invoice_issued": Receipt,
  "payment.reminder_sent": BellRing,
  "payment.deleted": Trash2,
  "pricing.price_changed": Tags,

  "meeting.created": CalendarPlus,
  "meeting.updated": CalendarDays,
  "meeting.status_changed": CalendarCheck,
  "meeting.outcome_recorded": CalendarCheck,
  "meeting.rescheduled": CalendarClock,
  "meeting.deleted": Trash2,

  "user.invited": UserRoundPlus,
  "user.role_changed": UserCog,
  "user.session_revoked": MonitorOff,
  "user.sessions_revoked": MonitorX,
  "user.access_link_sent": Mail,
  "user.backup_codes_regenerated": KeyRound,
  "user.deleted": Trash2,
  "settings.company_profile_updated": Building2,
  "settings.invoice_prefix_updated": Hash,
  "notification.read": MailOpen,
  "notification.read_all": CheckCheck,
  "notification.deleted": Trash2,
} satisfies Record<string, LucideIcon>;

export type KnownAction = keyof typeof ACTION_ICONS;

export const KNOWN_ACTIONS = Object.keys(ACTION_ICONS) as KnownAction[];

const VERB_ICONS: Record<string, LucideIcon> = {
  created: Plus,
  added: Plus,
  updated: Pencil,
  edited: Pencil,
  changed: ArrowRightLeft,
  moved: ArrowRightLeft,
  deleted: Trash2,
  removed: Trash2,
  sent: Send,
  signed: FileSignature,
  accepted: CircleCheck,
  approved: CircleCheck,
  completed: CircleCheck,
  succeeded: CircleCheck,
  resolved: ShieldCheck,
  declined: CircleX,
  rejected: CircleX,
  failed: CircleX,
  cancelled: Ban,
  suspended: Ban,
  expired: CalendarX2,
  revoked: ShieldOff,
  renewed: Repeat,
  viewed: Eye,
  read: MailOpen,
  opened: FolderOpen,
  started: Play,
  running: Play,
  paused: Pause,
  linked: Link2,
  unlinked: Unlink2,
  rotated: KeyRound,
  regenerated: KeyRound,
  recorded: ClipboardCheck,
  issued: Receipt,
  invited: UserRoundPlus,
  pinned: Pin,
  unpinned: PinOff,
  synced: RefreshCw,
  corrected: Pencil,
  activated: Power,
  reactivated: Power,
  due: AlarmClock,
  delivered: PackageCheck,
  queued: Hourglass,
  pending: Hourglass,
};

const ENTITY_ICONS: Record<EntityKind, LucideIcon> = {
  client: Building2,
  submission: Target,
  transparency_lead: Gauge,
  proposal: FileText,
  contract: FileSignature,
  project: Shapes,
  product: Boxes,
  payment: Wallet,
  subscription: Repeat,
  maintenance_request: Wrench,
  change_request: GitPullRequest,
  incident: ShieldAlert,
  deployment: Rocket,
  build: Hammer,
  task: ListChecks,
  meeting: CalendarDays,
  client_service: Server,
  user: UserCog,
  settings: Settings2,
};

const PREFIX_ICONS: Record<string, LucideIcon> = {
  auth: KeyRound,
  pricing: Tags,
  notification: Bell,
  note: StickyNote,
  log: Terminal,
};

export const FALLBACK_ICON: LucideIcon = Activity;

function split(action: string): { prefix: string; verb: string } {
  const dot = action.indexOf(".");
  if (dot === -1) return { prefix: action, verb: "" };
  return { prefix: action.slice(0, dot), verb: action.slice(dot + 1) };
}

function entityIcon(kind: string | null | undefined): LucideIcon | undefined {
  if (!kind) return undefined;
  const normalised = normalizeEntityType(kind);
  if (normalised) return ENTITY_ICONS[normalised];
  return PREFIX_ICONS[kind.toLowerCase()];
}

export function iconForEvent(action: string, entityType?: string | null): LucideIcon {
  const exact = (ACTION_ICONS as Record<string, LucideIcon>)[action];
  if (exact) return exact;
  const { prefix, verb } = split(action);
  const lastWord = verb.split("_").pop() ?? "";
  return (
    VERB_ICONS[verb] ??
    VERB_ICONS[lastWord] ??
    entityIcon(prefix) ??
    entityIcon(entityType) ??
    FALLBACK_ICON
  );
}

export function toneForEvent(action: string): Tone {
  const { verb } = split(action);
  if (
    /(^|_)(failed|declined|rejected|expired|revoked|rolled_back|cancelled|suspended|deleted)$/.test(verb) ||
    verb === "sign_in_failed" ||
    verb === "opened"
  ) {
    return "danger";
  }
  if (
    /(^|_)(signed|paid|recorded|resolved|succeeded|completed|accepted|approved|delivered|renewed|activated|reactivated|issued|signed_in)$/.test(
      verb,
    )
  ) {
    return "success";
  }
  if (/(^|_)(due|overdue|grace|past_due|reopened|warranty|paused|trialing)$/.test(verb)) return "warning";
  if (/(^|_)(started|running|in_progress|active|queued|pending|moved)$/.test(verb)) return "progress";
  if (/(^|_)(created|sent|invited|linked|added|pinned|assigned|quoted)$/.test(verb)) return "info";
  return "neutral";
}

const VERB_PHRASES: Record<string, string> = {
  signed_in: "signed in",
  signed_out: "signed out",
  sign_in_failed: "failed to sign in",
  reverted_to_draft: "reverted to draft",
  read_all: "read everything",
  past_due: "went past due",
  grace: "entered grace",
  in_progress: "in progress",
  rolled_back: "rolled back",
  warranty: "covered under warranty",
  trialing: "started a trial",
  active: "became active",
  renewal_due: "renewal due",
};

export type EventDomain = "clients" | "delivery" | "engineering" | "billing" | "system";

export const EVENT_DOMAINS: { key: EventDomain; label: string }[] = [
  { key: "clients", label: "Clients" },
  { key: "delivery", label: "Delivery" },
  { key: "engineering", label: "Engineering" },
  { key: "billing", label: "Billing" },
  { key: "system", label: "System" },
];

const DOMAIN_OF_KIND: Record<EntityKind, EventDomain> = {
  client: "clients",
  submission: "clients",
  transparency_lead: "clients",
  proposal: "clients",
  contract: "clients",
  meeting: "clients",
  project: "delivery",
  task: "delivery",
  change_request: "delivery",
  subscription: "delivery",
  maintenance_request: "delivery",
  client_service: "delivery",
  product: "engineering",
  build: "engineering",
  deployment: "engineering",
  incident: "engineering",
  payment: "billing",
  user: "system",
  settings: "system",
};

const DOMAIN_OF_PREFIX: Record<string, EventDomain> = {
  auth: "system",
  notification: "system",
  log: "engineering",
  pricing: "billing",
  note: "clients",
};

export function domainForEvent(action: string, entityType?: string | null): EventDomain | null {
  const { prefix } = split(action);
  const byPrefix = normalizeEntityType(prefix);
  if (byPrefix) return DOMAIN_OF_KIND[byPrefix];
  if (DOMAIN_OF_PREFIX[prefix.toLowerCase()]) return DOMAIN_OF_PREFIX[prefix.toLowerCase()]!;
  const byEntity = normalizeEntityType(entityType);
  return byEntity ? DOMAIN_OF_KIND[byEntity] : null;
}

export function labelForAction(action: string): string {
  const { prefix, verb } = split(action);
  if (!verb) return prefix.replace(/_/g, " ");
  if (VERB_PHRASES[verb]) return VERB_PHRASES[verb];
  const words = verb.split("_");
  if (words.length === 1) return words[0]!;
  const last = words[words.length - 1]!;
  const rest = words.slice(0, -1).join(" ");
  return `${last} ${rest}`;
}
