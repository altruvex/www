import Link from "next/link";
import { Wallet } from "lucide-react";
import { currentRole } from "@/lib/authorize";
import { canSeeFinance } from "@/lib/nav";
import { entityHref } from "@/lib/entity-links";
import { money, moneyByCurrency } from "@/lib/format";
import { DUE_SOON_DAYS } from "@/lib/payment-overdue";
import { getRevenueMetrics } from "@/lib/revenue-metrics";
import { toneText, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";

export async function RevenuePanel(): Promise<React.ReactNode> {
  if (!canSeeFinance(await currentRole())) return null;

  const now = new Date();
  const m = await getRevenueMetrics(now);
  const hasOverdue = m.overdueCount > 0;

  return (
    <Panel
      title="Revenue"
      description="Recurring, outstanding, and this month's cash"
      action={<PanelLink href="/payments">Billing</PanelLink>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="MRR (contracted)"
          value={moneyByCurrency(m.contractedMrr, true) || "0"}
          sub={
            m.activeRetainers
              ? `${m.activeRetainers} active retainer${m.activeRetainers === 1 ? "" : "s"}${
                  m.unpricedRetainers ? `, ${m.unpricedRetainers} unpriced` : ""
                }`
              : "No active retainers"
          }
          tone={m.activeRetainers ? "success" : "neutral"}
          href="/analytics"
        />
        <StatTile
          label="Outstanding"
          value={moneyByCurrency(m.outstanding, true) || "0"}
          sub={
            hasOverdue
              ? `${m.overdueCount} overdue of ${m.outstandingCount}`
              : `${m.outstandingCount} unpaid payment${m.outstandingCount === 1 ? "" : "s"}`
          }
          tone={
            hasOverdue ? "danger" : m.outstandingCount ? "warning" : "neutral"
          }
          href="/payments?tab=outstanding"
        />
        <StatTile
          label="Renewals due"
          value={m.renewalsNeedingAttention}
          sub={
            m.renewalsNeedingAttention
              ? "Retainers and services"
              : "Nothing coming due"
          }
          tone={m.renewalsNeedingAttention ? "warning" : "neutral"}
          href="/renewals"
        />
      </div>

      <dl className="mt-4 space-y-3 border-t border-border pt-4">
        <MoneyRow
          label="Collected this month"
          value={moneyByCurrency(m.collectedThisMonth) || "0"}
          tone="success"
          href="/payments?status=paid"
        />
        <MoneyRow
          label={`Due in ${DUE_SOON_DAYS} days`}
          value={moneyByCurrency(m.dueSoon) || "0"}
          tone={m.dueSoonCount ? "warning" : "neutral"}
          href="/payments?status=due"
        />
        <MoneyRow
          label="Overdue"
          value={moneyByCurrency(m.overdue) || "0"}
          tone={hasOverdue ? "danger" : "neutral"}
          href="/payments?status=overdue"
        />
      </dl>
      {hasOverdue && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {m.topOverdue.map((payment) => (
            <li key={payment.id} className="flex items-center gap-2 text-base">
              <Wallet
                className={cn("size-3.5 shrink-0", toneText.danger)}
                aria-hidden
              />
              <Link
                href={entityHref("payment", payment.id) ?? "/payments"}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {payment.label}
              </Link>
              <span
                className={cn(
                  "shrink-0 font-mono text-micro tabular-nums",
                  toneText.danger,
                )}
              >
                {money(payment.amount, payment.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function MoneyRow({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: string;
  tone: Tone;
  href: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-base text-muted-foreground">
        <Link href={href} className="hover:text-foreground hover:underline">
          {label}
        </Link>
      </dt>
      <dd
        className={cn(
          "shrink-0 font-mono text-md tabular-nums",
          toneText[tone],
        )}
      >
        {value}
      </dd>
    </div>
  );
}
