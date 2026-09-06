import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Blocks,
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
  ScrollText,
  Settings,
  Shapes,
  ShieldCheck,
  Sparkles,
  Tags,
  Target,
  Wrench,
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
  | "payments";

export const PRIMARY: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    state: "live",
    blurb: "What needs a human right now",
    badgeKey: "actions",
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: Inbox,
    state: "live",
    blurb: "Every unanswered client message, in one thread list",
    badgeKey: "inbox",
  },
];

export const GROUPS: NavGroup[] = [
  {
    id: "crm",
    label: "CRM",
    items: [
      {
        href: "/leads",
        label: "Leads",
        icon: Target,
        state: "live",
        blurb: "Raw demand from the website, before it is qualified",
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
        blurb: "The single source of truth for every company we work with",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      {
        href: "/pricing",
        label: "Pricing",
        icon: Tags,
        state: "live",
        blurb: "The only place a price is edited",
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
    id: "operations",
    label: "Operations",
    items: [
      {
        href: "/projects",
        label: "Projects",
        icon: Shapes,
        state: "live",
        blurb: "Delivery: phase, health, launch dates",
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
        label: "Maintenance",
        icon: Wrench,
        state: "live",
        blurb: "Retainers, allowances, and client requests",
      },
      {
        href: "/calendar",
        label: "Calendar",
        icon: CalendarDays,
        state: "live",
        blurb: "Meetings, deadlines, milestones and payment dates on one grid",
        badgeKey: "meetings",
      },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    items: [
      {
        href: "/whatsapp",
        label: "WhatsApp",
        icon: MessageCircle,
        state: "live",
        blurb: "Conversations bound to clients, proposals and contracts",
      },
      {
        href: "/email",
        label: "Email",
        icon: Mail,
        state: "planned",
        blurb: "Outbound transactional mail with delivery status and templates",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      {
        href: "/payments",
        label: "Payments",
        icon: Wallet,
        state: "live",
        blurb: "Milestone payments across every project",
        badgeKey: "payments",
        roles: ["OWNER", "ADMIN", "FINANCE"],
      },
      {
        href: "/invoices",
        label: "Invoices",
        icon: Receipt,
        state: "live",
        blurb: "Issued documents against a payment schedule",
        roles: ["OWNER", "ADMIN", "FINANCE"],
      },
    ],
  },
  {
    id: "records",
    label: "Records",
    items: [
      {
        href: "/documents",
        label: "Documents",
        icon: FolderOpen,
        state: "live",
        blurb: "Every generated file, bound to the record that produced it",
      },
      {
        href: "/activity",
        label: "Activity",
        icon: Activity,
        state: "live",
        blurb: "The operational memory: everything that happened, in order",
      },
      {
        href: "/audit",
        label: "Audit log",
        icon: ScrollText,
        state: "live",
        blurb: "Who changed what, from which value to which value",
        roles: ["OWNER", "ADMIN"],
      },
    ],
  },
  {
    id: "website",
    label: "Website",
    items: [
      {
        href: "/submissions",
        label: "Form submissions",
        icon: Globe,
        state: "live",
        blurb: "Raw, unmodified form payloads with their UTM and referrer",
      },
      {
        href: "/transparency",
        label: "Transparency",
        icon: Gauge,
        state: "live",
        blurb: "Public estimator completions and what they quoted",
      },
    ],
  },
  {
    id: "intel",
    label: "Intelligence",
    items: [
      {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        state: "live",
        blurb: "Conversion, cycle length, win rate, revenue",
      },
      {
        href: "/automations",
        label: "Automations",
        icon: Sparkles,
        state: "live",
        blurb: "When X happens, do Y — the rules that run the loop",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        href: "/integrations",
        label: "Integrations",
        icon: Blocks,
        state: "live",
        blurb: "WhatsApp Cloud API, mail, storage, database — health and config",
        roles: ["OWNER", "ADMIN"],
      },
      {
        href: "/health",
        label: "System health",
        icon: ShieldCheck,
        state: "live",
        blurb: "What is failing right now, and what to do about it",
        roles: ["OWNER", "ADMIN"],
      },
      {
        href: "/team",
        label: "Team",
        icon: Users,
        state: "live",
        blurb: "People, roles and what each role may do",
        roles: ["OWNER", "ADMIN"],
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        state: "live",
        blurb: "Company profile, workflow, templates, security",
        roles: ["OWNER", "ADMIN"],
      },
    ],
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
