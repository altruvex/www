import type { Metadata } from "next";
import { prisma } from "@repo/database";
import { AlertCircle } from "lucide-react";

import { formatHours, quoteAnswerable } from "@/lib/change-requests";
import { date, money } from "@/lib/format";
import { QuoteAnswer } from "./quote-answer";
import { PROJECT_CURRENCY_SELECT, projectCurrency } from "@/lib/project-currency";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Quote — Altruvex" },
  robots: { index: false, follow: false },
};

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await prisma.changeRequest.findUnique({
    where: { quoteToken: token },
    select: {
      title: true,
      detail: true,
      status: true,
      pricing: true,
      estimatedMinutes: true,
      hourlyRate: true,
      quotedAmount: true,
      quoteSentAt: true,
      quoteExpiresAt: true,
      approvedAt: true,
      closedAt: true,
      respondedByName: true,
      project: {
        select: {
          name: true,
          client: { select: { name: true, company: true } },
          ...PROJECT_CURRENCY_SELECT,
        },
      },
    },
  });

  const live = row ? quoteAnswerable(row) : null;

  if (!row || !live || (!live.ok && live.reason === "revising") || row.quotedAmount == null) {
    return (
      <Shell>
        <div className="py-4 text-center" role="status">
          <AlertCircle className="mx-auto mb-4 size-10 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-medium">
            {row ? "This quote is being revised" : "Quote not found"}
          </h1>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            {row
              ? "The figure is being updated, so it cannot be answered right now. The new quote will reach you on the same channel as this link."
              : "This link is not valid, or the quote was withdrawn. If it came from Altruvex, reply to that message and we will send a working one."}
          </p>
        </div>
      </Shell>
    );
  }

  const currency = projectCurrency(row.project);
  const hourly = row.pricing === "HOURLY" && row.hourlyRate != null;

  return (
    <Shell>
      <div>
        <p className="mb-1 text-sm text-muted-foreground">
          Altruvex · {row.project.client.company || row.project.client.name || row.project.name}
        </p>
        {/* brand-allow: hierarchy-multiple-h1 — separate render branch */}
        <h1 className="text-xl font-medium text-balance break-words sm:text-2xl">{row.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Change to {row.project.name}</p>
      </div>

      {row.detail && <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{row.detail}</p>}

      <dl className="space-y-2 rounded-panel-sm bg-muted/50 p-4 text-sm sm:p-5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-mono text-lg font-medium tabular-nums">{money(row.quotedAmount, currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Charged as</dt>
          <dd className="min-w-0 text-end font-medium">
            {hourly
              ? `${formatHours(row.estimatedMinutes)} estimated × ${money(row.hourlyRate, currency)} / hour`
              : "Fixed price"}
          </dd>
        </div>
        {row.quoteExpiresAt && row.status === "QUOTED" && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Valid until</dt>
            <dd className="font-medium">{date(row.quoteExpiresAt)}</dd>
          </div>
        )}
      </dl>

      {hourly && (
        <p className="text-sm text-muted-foreground">
          This is an estimate. The invoice follows the hours actually spent.
        </p>
      )}

      <QuoteAnswer
        token={token}
        amount={row.quotedAmount}
        amountLabel={money(row.quotedAmount, currency)}
        answerable={live.ok}
        state={
          row.status === "APPROVED" || row.status === "IN_PROGRESS" || row.status === "DELIVERED"
            ? {
                kind: "approved",
                by: row.respondedByName,
                on: row.approvedAt ? date(row.approvedAt) : null,
              }
            : row.status === "DECLINED"
              ? { kind: "declined", on: row.closedAt ? date(row.closedAt) : null }
              : row.status === "CANCELLED"
                ? { kind: "closed" }
                : !live.ok && live.reason === "expired"
                  ? { kind: "expired" }
                  : { kind: "open" }
        }
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-6 sm:items-center sm:py-12">
      <div className="plane w-full max-w-lg space-y-6 p-5 sm:p-8">{children}</div>
    </main>
  );
}
