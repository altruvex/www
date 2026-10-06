import type { LucideIcon } from "lucide-react";

import { can } from "@/lib/rbac";
import { pageDecision, ROUTE_GATES, type RouteGate } from "@/lib/route-gates";
import {
  BarChart3,
  Bell,
  Blocks,
  Boxes,
  Building2,
  CalendarDays,
  FileSignature,
  FileText,
  FolderOpen,
  Gauge,
  Globe,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Mail,
  MessageCircle,
  Receipt,
  RefreshCw,
  Rocket,
  ScrollText,
  ShieldAlert,
  Settings,
  Shapes,
  Sparkles,
  Tags,
  Target,
  Terminal,
  Wrench,
  Server,
  Users,
  Wallet,
} from "lucide-react";

export type NavState = "live" | "planned";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  state: NavState;
  blurb: string;
  badgeKey?: BadgeKey;
  roles?: Role[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export type Role = "OWNER" | "ADMIN" | "SALES" | "PM" | "FINANCE" | "VIEWER";

export type BadgeKey =
  | "leads"
  | "actions"
  | "proposals"
  | "contracts"
  | "meetings"
  | "inbox"
  | "payments"
  | "incidents"
  | "renewals";

const FINANCE_ROLES: Role[] = ["OWNER", "ADMIN", "FINANCE"];
const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export const PRIMARY: NavItem[] = [
  {
    href: "/",
    label: "Today",
    icon: LayoutDashboard,
    state: "live",
    blurb: "What requires your attention right now, and the state of everything else",
    badgeKey: "actions",
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: Inbox,
    state: "live",
    blurb: "Every client conversation — WhatsApp and email — in one place",
    badgeKey: "inbox",
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    state: "live",
    blurb: "Meetings, deadlines, milestones, renewals and payment dates on one grid",
    badgeKey: "meetings",
  },
];

export const GROUPS: NavGroup[] = [
  {
    id: "clients",
    label: "Clients",
    items: [
      {
        href: "/leads",
        label: "Leads",
        icon: Target,
        state: "live",
        blurb: "Demand from the website and the estimator, before it is qualified",
        badgeKey: "leads",
      },
      {
        href: "/pipeline",
        label: "Pipeline",
        icon: KanbanSquare,
        state: "live",
        blurb: "Every live deal as a board, by stage",
      },
      {
        href: "/clients",
        label: "Clients",
        icon: Building2,
        state: "live",
        blurb: "Every company we work with — its deals, delivery, money and history",
      },
      {
        href: "/proposals",
        label: "Proposals",
        icon: FileText,
        state: "live",
        blurb: "Offers: drafted, sent, read, accepted",
        badgeKey: "proposals",
      },
      {
        href: "/contracts",
        label: "Contracts",
        icon: FileSignature,
        state: "live",
        blurb: "Commitments and signature status",
        badgeKey: "contracts",
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    items: [
      {
        href: "/projects",
        label: "Projects",
        icon: Shapes,
        state: "live",
        blurb: "Delivery: phase, health, launch dates, change requests",
      },
      {
        href: "/tasks",
        label: "Tasks",
        icon: ListChecks,
        state: "live",
        blurb: "Work items inside a project, with assignee and due date",
      },
      {
        href: "/maintenance",
        label: "Retainers",
        icon: Wrench,
        state: "live",
        blurb: "Maintenance subscriptions: plan, period, allowance and requests",
      },
      {
        href: "/services",
        label: "Services",
        icon: Server,
        state: "live",
        blurb: "Domains, hosting and email per client — prices, expiry dates, renewal alerts",
      },
    ],
  },
  {
    id: "engineering",
    label: "Engineering",
    items: [
      {
        href: "/products",
        label: "Products",
        icon: Boxes,
        state: "live",
        blurb: "Every site and app Altruvex operates, and what is deployed on it",
      },
      {
        href: "/deployments",
        label: "Deployments",
        icon: Rocket,
        state: "live",
        blurb: "What shipped, what failed, and the builds behind them",
      },
      {
        href: "/logs",
        label: "Logs",
        icon: Terminal,
        state: "live",
        blurb: "What products report, filtered and traceable by request",
      },
      {
        href: "/incidents",
        label: "Incidents",
        icon: ShieldAlert,
        state: "live",
        blurb: "What is broken right now, who owns it, and what has been tried",
        badgeKey: "incidents",
      },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    items: [
      {
        href: "/renewals",
        label: "Renewals",
        icon: RefreshCw,
        state: "live",
        blurb: "Every retainer and service coming due, overdue or lapsed",
        badgeKey: "renewals",
        roles: FINANCE_ROLES,
      },
      {
        href: "/payments",
        label: "Billing",
        icon: Wallet,
        state: "live",
        blurb: "Charges, payments, outstanding balances and invoices",
        badgeKey: "payments",
        roles: FINANCE_ROLES,
      },
      {
        href: "/pricing",
        label: "Pricing",
        icon: Tags,
        state: "live",
        blurb: "The only place a price is edited",
        roles: FINANCE_ROLES,
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        state: "live",
        blurb: "Conversion, cycle length, win rate, revenue, recurring revenue",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        href: "/audit",
        label: "Audit log",
        icon: ScrollText,
        state: "live",
        blurb: "Who changed what, from which value to which value",
        roles: ADMIN_ROLES,
      },
      {
        href: "/automations",
        label: "Automations",
        icon: Sparkles,
        state: "live",
        blurb: "What the system does on its own, and where each behaviour lives",
      },
      {
        href: "/integrations",
        label: "Integrations",
        icon: Blocks,
        state: "live",
        blurb: "WhatsApp, mail, Slack, GitHub, storage — health, failures and config",
        roles: ADMIN_ROLES,
      },
      {
        href: "/team",
        label: "Team",
        icon: Users,
        state: "live",
        blurb: "People, roles, capabilities and sessions",
        roles: ADMIN_ROLES,
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        state: "live",
        blurb: "Company profile, invoicing, workflow, security",
        roles: ADMIN_ROLES,
      },
    ],
  },
];

export const SECONDARY: NavItem[] = [
  {
    href: "/actions",
    label: "All actions",
    icon: ListChecks,
    state: "live",
    blurb: "The full attention queue behind Today",
  },
  {
    href: "/whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    state: "live",
    blurb: "WhatsApp conversations bound to clients",
  },
  {
    href: "/email",
    label: "Email",
    icon: Mail,
    state: "live",
    blurb: "Outbound mail with delivery status",
  },
  {
    href: "/submissions",
    label: "Form submissions",
    icon: Globe,
    state: "live",
    blurb: "Raw form payloads with their UTM and referrer",
  },
  {
    href: "/transparency",
    label: "Estimator leads",
    icon: Gauge,
    state: "live",
    blurb: "Public estimator completions and what they quoted",
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: Receipt,
    state: "live",
    blurb: "Issued invoice documents against payments",
    roles: FINANCE_ROLES,
  },
  {
    href: "/documents",
    label: "Documents",
    icon: FolderOpen,
    state: "live",
    blurb: "Every generated file, bound to the record that produced it",
  },
];

export const NOTIFICATIONS_ITEM: NavItem = {
  href: "/notifications",
  label: "Notifications",
  icon: Bell,
  state: "live",
  blurb: "Everything the system wanted to tell you",
};

export const ALL_NAV_ITEMS: NavItem[] = [
  ...PRIMARY,
  ...GROUPS.flatMap((g) => g.items),
  ...SECONDARY,
  NOTIFICATIONS_ITEM,
];

export function navItemFor(pathname: string): NavItem | undefined {
  const exact = ALL_NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact;
  return ALL_NAV_ITEMS.filter((i) => i.href !== "/")
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname.startsWith(`${i.href}/`) || pathname === i.href);
}

export function groupFor(pathname: string): NavGroup | undefined {
  return GROUPS.find((g) =>
    g.items.some((i) => i.href !== "/" && pathname.startsWith(i.href)),
  );
}

export function canSee(item: NavItem, role: Role | undefined): boolean {
  const gate = (ROUTE_GATES as Record<string, RouteGate | undefined>)[item.href];
  if (gate) return pageDecision(role, gate.required, gate.roles);
  if (!item.roles || item.roles.length === 0) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

export function canSeeFinance(role: Role | undefined): boolean {
  return role != null && FINANCE_ROLES.includes(role);
}

export interface GotoShortcut {
  key: string;
  href: string;
  label: string;
}

export const GOTO_SHORTCUTS: GotoShortcut[] = [
  { key: "d", href: "/", label: "Today" },
  { key: "i", href: "/inbox", label: "Inbox" },
  { key: "m", href: "/calendar", label: "Calendar" },
  { key: "l", href: "/leads", label: "Leads" },
  { key: "k", href: "/pipeline", label: "Pipeline" },
  { key: "c", href: "/clients", label: "Clients" },
  { key: "p", href: "/proposals", label: "Proposals" },
  { key: "n", href: "/contracts", label: "Contracts" },
  { key: "o", href: "/projects", label: "Projects" },
  { key: "t", href: "/tasks", label: "Tasks" },
  { key: "e", href: "/deployments", label: "Deployments" },
  { key: "x", href: "/incidents", label: "Incidents" },
  { key: "r", href: "/renewals", label: "Renewals" },
  { key: "b", href: "/payments", label: "Billing" },
  { key: "a", href: "/analytics", label: "Analytics" },
  { key: "s", href: "/settings", label: "Settings" },
];

export function gotoShortcutsFor(role: Role | undefined): GotoShortcut[] {
  return GOTO_SHORTCUTS.filter((shortcut) => {
    const item = ALL_NAV_ITEMS.find((i) => i.href === shortcut.href);
    return !item || canSee(item, role);
  });
}

export interface CreateShortcut {
  key: string;
  href: string;
  label: string;
}

const CREATE_SHORTCUT_KEYS: Array<{ key: string; id: string; label: string }> = [
  { key: "t", id: "task", label: "New task" },
  { key: "m", id: "meeting", label: "New meeting" },
  { key: "c", id: "client", label: "New client" },
  { key: "p", id: "charge", label: "New payment charge" },
];

export function createShortcutsFor(
  role: Role | undefined,
  pathname?: string | null,
): CreateShortcut[] {
  const actions = quickCreateFor(role, pathname);
  return CREATE_SHORTCUT_KEYS.flatMap(({ key, id, label }) => {
    const href = actions.find((a) => a.id === id)?.href;
    return href ? [{ key, href, label }] : [];
  });
}

/**
 * The record the operator is standing on, read from the path, so a create
 * action can pre-fill its parent (client page → client, project page →
 * project, product page → product).
 */
export interface CreateContext {
  clientId?: string;
  projectId?: string;
  productId?: string;
}

export function createContextFor(pathname: string | null | undefined): CreateContext {
  const match = /^\/(clients|projects|products)\/([^/?#]+)/.exec(pathname ?? "");
  if (!match || match[2] === "new") return {};
  const id = match[2]!;
  if (match[1] === "clients") return { clientId: id };
  if (match[1] === "projects") return { projectId: id };
  return { productId: id };
}

function routeOpen(role: Role | undefined, href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? "/";
  const gates = ROUTE_GATES as Record<string, RouteGate | undefined>;
  const first = path.split("/").filter(Boolean)[0];
  const gate = gates[path] ?? gates[first ? `/${first}` : "/"];
  if (!gate) return true;
  return pageDecision(role, gate.required, gate.roles);
}

function withParams(base: string, params: Record<string, string | undefined>): string {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  if (!query) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
}

export interface QuickCreate {
  id: string;
  /** The noun alone — "Client", "Task". */
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Opens the create form directly. `null` = the palette's "choose the client" mode. */
  href: string | null;
  /** The href carries a parent taken from the current record page. */
  scoped: boolean;
}

/**
 * Every "New X" the shell offers (top-bar "+" menu, command palette). Each
 * href opens X's create form, never a bare list, and carries the parent from
 * the current record page when there is one.
 */
export function quickCreateFor(
  role: Role | undefined,
  pathname?: string | null,
): QuickCreate[] {
  const ctx = createContextFor(pathname);
  const forClient = ctx.clientId ? "for this client" : "";
  const forProject = ctx.projectId ? "for this project" : "";
  const forProduct = ctx.productId ? "for this product" : "";
  const all: Array<Omit<QuickCreate, "scoped"> & { allowed: boolean }> = [
    {
      id: "client",
      label: "Client",
      hint: "",
      icon: Building2,
      href: "/clients/new",
      allowed: can(role, "create", "client"),
    },
    {
      id: "proposal",
      label: "Proposal",
      hint: ctx.clientId ? forClient : "choose the client",
      icon: FileText,
      href: ctx.clientId ? `/clients/${encodeURIComponent(ctx.clientId)}/new-proposal` : null,
      allowed: can(role, "create", "proposal"),
    },
    {
      id: "meeting",
      label: "Meeting",
      hint: forClient || "on the calendar",
      icon: CalendarDays,
      href: withParams("/calendar?new=meeting", { client: ctx.clientId }),
      allowed: can(role, "create", "meeting"),
    },
    {
      id: "task",
      label: "Task",
      hint: forProject,
      icon: ListChecks,
      href: withParams("/tasks?new=task", { project: ctx.projectId }),
      allowed: can(role, "create", "project"),
    },
    {
      id: "project",
      label: "Recorded project",
      hint: forClient || "work already under way",
      icon: Shapes,
      href: withParams("/projects?new=recorded", { client: ctx.clientId }),
      allowed: can(role, "create", "project"),
    },
    {
      id: "product",
      label: "Product",
      hint: forClient || forProject,
      icon: Boxes,
      href: withParams("/products?new=product", {
        client: ctx.clientId,
        project: ctx.projectId,
      }),
      allowed: can(role, "create", "project"),
    },
    {
      id: "service",
      label: "Service",
      hint: forClient || forProject || forProduct || "domain, hosting, licence",
      icon: Globe,
      href: withParams("/services?new=service", {
        client: ctx.clientId,
        project: ctx.projectId,
        product: ctx.productId,
      }),
      allowed: can(role, "create", "project"),
    },
    {
      id: "charge",
      label: "Charge",
      hint: forClient || forProject,
      icon: Wallet,
      href: withParams("/payments?new=charge", {
        client: ctx.clientId,
        project: ctx.projectId,
      }),
      allowed: can(role, "create", "payment") && canSeeFinance(role),
    },
    {
      id: "retainer",
      label: "Retainer",
      hint: forClient,
      icon: Wrench,
      href: withParams("/maintenance?new=retainer", { client: ctx.clientId }),
      allowed: can(role, "create", "payment"),
    },
    {
      id: "incident",
      label: "Incident",
      hint: forProduct,
      icon: ShieldAlert,
      href: withParams("/incidents?new=incident", { product: ctx.productId }),
      allowed: can(role, "create", "incident"),
    },
  ];
  return all
    .filter((item) => item.allowed && (item.href == null || routeOpen(role, item.href)))
    .map((item) => ({
      id: item.id,
      label: item.label,
      hint: item.hint,
      icon: item.icon,
      href: item.href,
      scoped:
        item.href != null &&
        /[?&](client|project|product)=|^\/clients\/[^/]+\/new-proposal/.test(item.href),
    }));
}
