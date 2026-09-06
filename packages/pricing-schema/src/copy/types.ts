import type {
  AddonId,
  ComplexityId,
  ConsultingPackageId,
  MaintenancePlanId,
  ServiceId,
  TierId,
} from "../ids";
import type { BillingCycle } from "../types";

export interface ServiceCopy {
  /**
   * Formal name used in proposals and contracts.
   *
   * Kept distinct from `name` because generated documents already in a
   * client's hands say "Corporate Website", while the estimator's option list
   * says "Website". Changing document wording is out of scope for a data-layer
   * refactor, so both spellings are held rather than reconciled.
   */
  readonly documentName: string;
  readonly name: string;
  readonly description: string;
}

export interface TierCopy {
  readonly name: string;
  readonly buyerLabel: string;
  readonly internalLabel: string;
  readonly idealFor: string;
  readonly notIncluded: string;
  readonly features: readonly string[];
  readonly nextStep: string;
  readonly ctaLabel: string;
}

export interface MaintenanceCopy {
  readonly name: string;
  /** Descriptive bullets only — scope lines are templated, see below. */
  readonly features: readonly string[];
}

/**
 * Scope lines that quote a number are templates, not literals.
 *
 * `requestsPerCycle` and the overage rate live in the schema; these strings
 * hold only the wording around them. That is what stops a plan from saying
 * "up to 2 requests" while the schema caps it at 4.
 */
export interface MaintenanceTemplates {
  readonly requestCap: string;
  readonly requestCapPriority: string;
  readonly portal: string;
  readonly overage: string;
  readonly customPrice: string;
  readonly perCycle: Readonly<Record<BillingCycle, string>>;
}

export interface ConsultingCopy {
  /** Heading split: the page renders `titleItalic` inside a <Highlight>. */
  readonly title: string;
  readonly titleItalic: string;
  readonly name: string;
  readonly description: string;
  readonly deliverables: readonly string[];
  readonly durationLabel: string;
  readonly duration: string;
  readonly priceLabel: string;
  readonly ctaLabel: string;
  readonly eyebrow: string;
  readonly includedLabel: string;
}

export interface AddonCopy {
  readonly name: string;
  readonly description: string;
}

export interface TermsCopy {
  readonly vatLabel: string;
  readonly vatNote: string;
  readonly revisionLabel: string;
  readonly revisionNote: string;
  readonly usdLabel: string;
  readonly usdNote: string;
  readonly addonLabel: string;
  readonly addonNote: string;
  readonly costBasisLabel: string;
  readonly markupLabel: string;
  readonly totalLabel: string;
  readonly pendingLabel: string;
}

export interface PricingCopy {
  readonly services: Readonly<Record<ServiceId, ServiceCopy>>;
  /** Complexity band names as they appear in proposals and contracts. */
  readonly bands: Readonly<Record<ComplexityId, string>>;
  readonly tiers: Readonly<Record<TierId, TierCopy>>;
  readonly maintenance: Readonly<Record<MaintenancePlanId, MaintenanceCopy>>;
  readonly maintenanceTemplates: MaintenanceTemplates;
  readonly consulting: Readonly<Record<ConsultingPackageId, ConsultingCopy>>;
  readonly addons: Readonly<Record<AddonId, AddonCopy>>;
  readonly terms: TermsCopy;
}
