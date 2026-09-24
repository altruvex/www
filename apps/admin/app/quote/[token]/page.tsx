import type { Metadata } from "next";
import { prisma } from "@repo/database";
import { AlertCircle } from "lucide-react";

import { formatHours, quoteAnswerable } from "@/lib/change-requests";
import { date, money } from "@/lib/format";
import { QuoteAnswer } from "./quote-answer";

/**
 * The page a client opens from a change-request quote. Reached by token only
 * (exempted in `proxy.ts`), and it shows only what the client was sent: the
 * request, the figure, how it is charged and until when it holds. Nothing
 * internal — no estimate history, no notes, no other request on the project.
 */

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
          contract: { select: { proposal: { select: { currency: true } } } },
        },
      },
    },
  });

  // A token exists from the moment a request is quoted and survives a re-quote,
  // so an unsent quote on a known token is a revision in progress — the client
  // sees that, never a figure nobody has sent them yet.
  if (!row || (!row.quoteSentAt && row.status === "QUOTED")) {
    return (
      <Shell>
        <div className="py-6 text-center">
          <AlertCircle className="mx-auto mb-4 size-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-medium">
            {row ? "This quote is being revised" : "Quote not found"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {row
              ? "You will receive the updated quote shortly."
              : "This link is not valid. If it came from Altruvex, reply to that message and we will resend it."}
          </p>
        </div>
      </Shell>
    );
  }

  const currency = row.project.contract.proposal.currency;
  const live = quoteAnswerable(row);
  const hourly = row.pricing === "HOURLY" && row.hourlyRate != null;

  return (
    <Shell>
      <div>
        <p className="mb-1 text-sm text-muted-foreground">
          Altruvex · {row.project.client.company || row.project.client.name || row.project.name}
        </p>
        <h1 className="text-2xl font-medium text-balance">{row.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Change to {row.project.name}</p>
      </div>

      {row.detail && <p className="whitespace-pre-line text-sm text-muted-foreground">{row.detail}</p>}

      <dl className="space-y-2 rounded-2xl bg-muted/50 p-5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-mono text-lg font-medium tabular-nums">{money(row.quotedAmount, currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Charged as</dt>
          <dd className="text-end font-medium">
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
        amount={row.quotedAmount ?? 0}
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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="plane w-full max-w-lg space-y-6 p-8">{children}</div>
    </main>
  );
}
