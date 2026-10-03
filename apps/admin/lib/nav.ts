import type { LucideIcon } from "lucide-react";
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

/**
 * The information architecture.
 *
 * `state` is the honesty valve. This app is built against a real Prisma schema;
 * modules with no model behind them are marked "planned" and render a spec page
 * that says what they will do and what has to exist first. They are NOT hidden
 * (the operator needs to see where the system is going) and they are NOT faked
 * with mock rows (a screen full of invented clients is worse than an empty one).
 *
 * Progressive disclosure: `primary` items sit at the top level always. Group
 * children collapse; a group auto-expands when the current route is inside it.
 */
export type NavState = "live" | "planned";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  state: NavState;
  /** Shown in the palette and on the planned page. */
  blurb: string;
  /** Dot in the sidebar: a count fetched by the shell. */
  badgeKey?: BadgeKey;
  /** Roles allowed to see it. Empty = everyone signed in. */
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

/**
 * The OS is organised by the question the operator is asking, not by table:
 * "what needs me today", "who are we selling to", "what are we delivering",
 * "is it running", "are we being paid", "how is the system set up".
 *
 * Merged surfaces (2026-10 OS pass): WhatsApp + Email are channels inside
 * Inbox; form submissions + estimator leads are tabs of Leads; invoices are a
 * tab of Billing; system health lives in Integrations; the derived activity
 * feed gave way to the persisted audit log. Their routes still exist — they
 * are reached from the tabs and the palette (`SECONDARY`), not the sidebar.
 */
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

/**
 * Live surfaces that are not in the sidebar: tabs of a merged page, or tools
 * reached from a record. The palette and the breadcrumb still know them.
 */
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

/** Flat list — used by the command palette and breadcrumb resolution. */
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
  if (!item.roles || item.roles.length === 0) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

/** Finance figures (cash, balances, overdue amounts) follow the Billing rule. */
export function canSeeFinance(role: Role | undefined): boolean {
  return role != null && FINANCE_ROLES.includes(role);
}

/**
 * The `g` + key chords. One table: the shell's key handler and the shortcuts
 * sheet both read it, so a chord can never work without being listed, or be
 * listed without working. A chord to a route the role cannot see is dropped by
 * both, the same way the sidebar drops the item.
 */
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

/** The chords this role may use — filtered by the nav item each one opens. */
export function gotoShortcutsFor(role: Role | undefined): GotoShortcut[] {
  return GOTO_SHORTCUTS.filter((shortcut) => {
    const item = ALL_NAV_ITEMS.find((i) => i.href === shortcut.href);
    return !item || canSee(item, role);
  });
}
