import type { ConsultingPackageId } from "./ids";
import type { Amount, EntityStatus, Versioned } from "./types";

/**
 * Fixed-scope consulting engagements.
 *
 * The Technical Audit is the entry offer, and its price is quoted in three
 * places on the site (the consulting page, the homepage authority card, and
 * the FAQ). All three resolve here.
 */
export interface ConsultingPackage extends Versioned {
  readonly id: ConsultingPackageId;
  readonly status: EntityStatus;
  /** Fixed EGP price. Null would mean quote-only; the audit is never quoted. */
  readonly price: Amount;
  readonly durationBusinessDays: number;
  readonly deliverableCount: number;
  /**
   * The share of this package's fee that comes off the project price when the
   * client goes on to build with Altruvex. `1` credits the whole fee; `0`
   * means the engagement is priced on its own and nothing carries forward.
   *
   * This is a price-shaped promise, not presentation: the consulting page, a
   * proposal that follows an audit and the signed contract all state it, so it
   * belongs beside the figure it reduces rather than in three copies of prose.
   * It is deliberately not part of `ConsultingOverride` — admin edits a price,
   * and changing what a client is owed on a fee they already paid is a policy
   * decision that ships with a deploy.
   */
  readonly creditedToBuildRate: number;
}

export const CONSULTING_PACKAGES: Readonly<
  Record<ConsultingPackageId, ConsultingPackage>
> = {
  "technical-audit": {
    id: "technical-audit",
    status: "active",
    price: 12_000,
    durationBusinessDays: 5,
    deliverableCount: 5,
    creditedToBuildRate: 1,
    version: 4,
    lastUpdated: "2026-09-20",
  },
};

export function publicConsultingPackages(): readonly ConsultingPackage[] {
  return Object.values(CONSULTING_PACKAGES).filter(
    (pkg) => pkg.status === "active",
  );
}

/**
 * What the client gets back against the build, in money.
 *
 * Rounded because it is quoted to a client and, when an operator applies it,
 * invoiced — a fractional pound in a contract is a figure nobody can pay.
 */
export function consultingCreditAmount(pkg: ConsultingPackage): Amount {
  return Math.round(pkg.price * pkg.creditedToBuildRate);
}
