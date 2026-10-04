import type { ConsultingPackageId } from "./ids";
import type { Amount, EntityStatus, Versioned } from "./types";

export interface ConsultingPackage extends Versioned {
  readonly id: ConsultingPackageId;
  readonly status: EntityStatus;
  readonly price: Amount;
  readonly durationBusinessDays: number;
  readonly deliverableCount: number;
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

export function consultingCreditAmount(pkg: ConsultingPackage): Amount {
  return Math.round(pkg.price * pkg.creditedToBuildRate);
}
