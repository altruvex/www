import type { ConsultingPackageId } from "./ids.js";
import type { Amount, EntityStatus, Versioned } from "./types.js";

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
}

export const CONSULTING_PACKAGES: Readonly<
  Record<ConsultingPackageId, ConsultingPackage>
> = {
  "technical-audit": {
    id: "technical-audit",
    status: "active",
    price: 15_000,
    durationBusinessDays: 5,
    deliverableCount: 5,
    version: 2,
    lastUpdated: "2026-09-06",
  },
};

export function publicConsultingPackages(): readonly ConsultingPackage[] {
  return Object.values(CONSULTING_PACKAGES).filter(
    (pkg) => pkg.status === "active",
  );
}
