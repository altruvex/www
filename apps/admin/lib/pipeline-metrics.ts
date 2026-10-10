import { scaleByCurrency, sumByCurrency } from "@/lib/format";

/** The fields of a pipeline card the quote metrics read. */
export interface QuoteCard {
  id: string;
  /** Derived stage (deriveClientStage). */
  stage: string;
  /** Total of the client's latest non-draft proposal, or null (none, or money hidden). */
  value: number | null;
  currency: string;
}

/** Stages that are not an active opportunity: won, parked, closed or junk. */
const CLOSED_STAGES: ReadonlySet<string> = new Set(["SIGNED", "LOST", "SPAM", "NURTURE"]);

/**
 * Quoted value and average over active opportunities only: one card per
 * client, its latest proposal version, open stage, and a quote that is still
 * live (`liveQuoteIds`, from isLiveQuote). Signed, lost, spam and nurture deals
 * never mix in, and no stage probability is applied. An empty set gives `{}`
 * per currency, which renders as "—".
 */
export function openQuoteMetrics(cards: QuoteCard[], liveQuoteIds: ReadonlySet<string>) {
  const open = cards.filter(
    (c) => !CLOSED_STAGES.has(c.stage) && c.value != null && liveQuoteIds.has(c.id),
  );
  const quoted = sumByCurrency(open.map((c) => ({ amount: c.value ?? 0, currency: c.currency })));
  const average = scaleByCurrency(quoted, (currency) => {
    const n = open.filter((c) => c.currency === currency).length;
    return n ? 1 / n : 0;
  });
  return { open, quoted, average };
}
