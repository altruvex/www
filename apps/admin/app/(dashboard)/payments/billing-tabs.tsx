import Link from "next/link";
import { cn } from "@/lib/utils";

export type BillingTab = "payments" | "outstanding" | "invoices";

const TABS: ReadonlyArray<{ id: BillingTab; label: string; href: string }> = [
  { id: "payments", label: "Payments", href: "/payments" },
  { id: "outstanding", label: "Outstanding", href: "/payments?tab=outstanding" },
  { id: "invoices", label: "Invoices", href: "/invoices" },
];

export function BillingTabs({
  active,
  counts,
}: {
  active: BillingTab;
  counts?: Partial<Record<BillingTab, number>>;
}) {
  return (
    <nav className="flex h-9 items-center gap-4 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <span className="font-mono text-micro tabular-nums text-subtle-foreground">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
