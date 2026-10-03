import Link from "next/link";
import { prisma } from "@repo/database";
import { deriveClientStage } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

/**
 * The intake hub's tab bar: Leads · Form submissions · Estimator.
 *
 * `TabNav` drives tabs from one base path plus a search param; these three are
 * three routes (each keeps its own URL, filters and saved table view), so this
 * renders the same bar with a href per tab. The markup is TabNav's, copied on
 * purpose — change the two together.
 */
export type IntakeTab = "leads" | "submissions" | "estimator";

/** The stages that still count as a lead — one place, shared with /leads. */
export const LEAD_STAGES = ["NEW", "VIEWED", "CONTACTED", "QUALIFIED"] as const;

/** Stored statuses a lead can have; a superset prefilter for the derived stage. */
export const LEAD_STATUS_PREFILTER: (
  | "NEW"
  | "VIEWED"
  | "CONTACTED"
  | "QUALIFIED"
)[] = ["NEW", "VIEWED", "CONTACTED", "QUALIFIED"];

const TABS: { id: IntakeTab; label: string; href: string }[] = [
  { id: "leads", label: "Leads", href: "/leads" },
  { id: "submissions", label: "Form submissions", href: "/submissions" },
  { id: "estimator", label: "Estimator", href: "/transparency" },
];

async function intakeCounts() {
  const [clients, submissions, estimates] = await Promise.all([
    prisma.client.findMany({
      where: { status: { in: LEAD_STATUS_PREFILTER } },
      select: {
        status: true,
        proposals: {
          select: { status: true, readAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        contracts: {
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.contactSubmission.count({
      where: { client: null, status: { not: "SPAM" } },
    }),
    prisma.transparencyLead.count({ where: { client: null } }),
  ]);
  const leads = clients.filter((c) =>
    (LEAD_STAGES as readonly string[]).includes(deriveClientStage(c)),
  ).length;
  return { leads, submissions, estimator: estimates };
}

export async function IntakeTabs({ active }: { active: IntakeTab }) {
  // A count failing must never take the page down — the bar still navigates.
  const counts = await intakeCounts().catch(() => null);
  return (
    <nav
      aria-label="Intake"
      className="flex h-9 items-center gap-4 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const count = counts?.[tab.id];
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-base",
              "transition-colors duration-[var(--dur-state)]",
              isActive
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {count != null && count > 0 && (
              <span
                className="font-mono text-micro tabular-nums text-subtle-foreground"
                title={
                  tab.id === "leads"
                    ? "Open leads"
                    : tab.id === "submissions"
                      ? "Not yet converted"
                      : "Estimates not yet converted"
                }
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
