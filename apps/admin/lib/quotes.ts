/**
 * The one rule for whether a client's latest quote is money on the table, shared
 * by /leads (a row's value) and /pipeline ("Quoted"). An accepted quote stays
 * live; a rejected or expired one, or one past its `validUntil`, does not.
 */
export function isLiveQuote(
  proposal: { status: string; validUntil: Date | null } | null | undefined,
  now: Date,
): boolean {
  if (!proposal) return false;
  if (proposal.status === "ACCEPTED") return true;
  if (proposal.status === "REJECTED" || proposal.status === "EXPIRED") return false;
  return !(proposal.validUntil && proposal.validUntil < now);
}
