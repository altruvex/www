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
  /**
   * The same plan, answered against the same questions as every other plan,
   * so a surface can lay the three side by side. Short phrases, one per
   * question; the prose in `features` stays for places that list a plan
   * on its own.
   */
  readonly compare: MaintenanceCompare;
}

export interface MaintenanceCompare {
  /** Who the plan is for, in one line. */
  readonly bestFor: string;
  /** How often the system is checked. */
  readonly cadence: string;
  readonly monitoring: string;
  readonly reporting: string;
  readonly support: string;
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
  /** The overage rate alone, for a table cell: "{rate} EGP / hour". */
  readonly overageShort: string;
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
  /**
   * The credit rule, authored as its two halves rather than one sentence.
   *
   * A client reads a fee that forks: it comes off the build, or it buys the
   * findings outright. Surfaces render the fork as two lines, so a single
   * string would force every one of them to split it back apart — and the
   * half that is easiest to drop in a layout is the one that costs the
   * client money to lose.
   */
  readonly creditLabel: string;
  /** Carries `{credit}` — the money that comes off the project price. */
  readonly creditIfBuild: string;
  readonly creditIfNot: string;
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

/**
 * Wording around a tier's delivery window.
 *
 * A template, not a literal, for the same reason the maintenance scope lines
 * are: the weeks come from the service matrix, so a card cannot advertise a
 * window the estimator would not quote. `ceiling` states both numbers a buyer
 * meets: the matrix's own window ({windowMin}-{windowMax} weeks) and the cap
 * ({ceiling}) that the estimator's conditions can stretch a quote to. Quoting
 * the cap alone read as a contradiction beside a matrix that stops at 8.
 */
export interface TierTemplates {
  readonly timelineLabel: string;
  readonly timelineValue: string;
  readonly ceiling: string;
}

export interface PricingCopy {
  readonly services: Readonly<Record<ServiceId, ServiceCopy>>;
  /** Complexity band names as they appear in proposals and contracts. */
  readonly bands: Readonly<Record<ComplexityId, string>>;
  readonly tiers: Readonly<Record<TierId, TierCopy>>;
  readonly tierTemplates: TierTemplates;
  readonly maintenance: Readonly<Record<MaintenancePlanId, MaintenanceCopy>>;
  readonly maintenanceTemplates: MaintenanceTemplates;
  readonly consulting: Readonly<Record<ConsultingPackageId, ConsultingCopy>>;
  readonly addons: Readonly<Record<AddonId, AddonCopy>>;
  readonly terms: TermsCopy;
}
