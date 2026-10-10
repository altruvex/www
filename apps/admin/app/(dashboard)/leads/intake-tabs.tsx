import Link from "next/link";
import { prisma } from "@repo/database";
import { openWorkWhere } from "@/lib/sales-signals";
import { cn } from "@/lib/utils";
import { Hint } from "@repo/ui";

export type IntakeTab = "leads" | "submissions" | "estimator";

const TABS: { id: IntakeTab; label: string; href: string }[] = [
  { id: "leads", label: "Leads", href: "/leads" },
  { id: "submissions", label: "Form submissions", href: "/submissions" },
  { id: "estimator", label: "Estimator", href: "/transparency" },
];

// Database-side counts only. "Leads" is the /leads queue's "All open work"
// total (the same openWorkWhere), so the tab and the page never disagree.
async function intakeCounts() {
  const [leads, submissions, estimator] = await Promise.all([
    prisma.client.count({ where: openWorkWhere() }),
    prisma.contactSubmission.count({
      where: { client: null, status: { not: "SPAM" } },
    }),
    prisma.transparencyLead.count({ where: { client: null } }),
  ]);
  return { leads, submissions, estimator };
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
                    ? "Open work in the sales queue"
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
