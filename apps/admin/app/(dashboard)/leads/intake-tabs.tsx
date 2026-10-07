import Link from "next/link";
import { prisma } from "@repo/database";
import { STAGE_MEETINGS_SELECT, deriveClientStage } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import { Hint } from "@repo/ui";

export type IntakeTab = "leads" | "submissions" | "estimator";

/** Derived stages that count as an active lead (before a proposal goes out). */
export const LEAD_STAGES = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUALIFYING",
  "QUALIFIED",
  "CALL_BOOKED",
  "CALL_COMPLETED",
] as const;

/** Stored statuses that can derive to a lead stage — narrows the query only. */
export const LEAD_STATUS_PREFILTER: (
  | "NEW"
  | "VIEWED"
  | "CONTACTED"
  | "QUALIFYING"
  | "QUALIFIED"
)[] = ["NEW", "VIEWED", "CONTACTED", "QUALIFYING", "QUALIFIED"];

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
        projects: { select: { id: true }, take: 1 },
        contracts: {
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        ...STAGE_MEETINGS_SELECT,
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
  const counts = await intakeCounts().catch(() => null);
  return (
    <nav
      aria-label="Intake"
      className="flex h-9 items-center gap-4 overflow-x-auto border-b pointer-coarse:h-11 border-border-subtle [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              "relative -mb-px inline-flex h-9 shrink-0 pointer-coarse:h-11 items-center gap-1.5 whitespace-nowrap border-b-2 text-base",
              "transition-colors duration-[var(--dur-state)]",
              isActive
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {count != null && count > 0 && (
              <Hint
                label={
                  tab.id === "leads"
                    ? "Open leads"
                    : tab.id === "submissions"
                      ? "Not yet converted"
                      : "Estimates not yet converted"
                }
              >
                <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                  {count}
                </span>
              </Hint>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
