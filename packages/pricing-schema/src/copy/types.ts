import type {
  AddonId,
  ComplexityId,
  ConsultingPackageId,
  MaintenancePlanId,
  ScopeNoteId,
  ServiceId,
} from "../ids";
import type { MaintenanceInterval } from "../maintenance";
import type { FactorGroupId } from "../modifiers";
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
  /** The suffix after a per-invoice figure, one per `MaintenanceInterval`. */
  readonly perInterval: Readonly<Record<MaintenanceInterval, string>>;
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
  /**
   * The one-sentence "excluding VAT" statement the estimator and the pricing
   * page carry next to a figure. Carries `{rate}`.
   */
  readonly vatExcluded: string;
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
  /**
   * The three payment milestones, in `paymentSplit` order. Each carries `{p}`
   * — the percent, formatted — and names what triggers it: the start, an
   * agreed development milestone, and the production launch. The trigger
   * wording lives here so a proposal, a contract and the pricing page cannot
   * describe the same 30% three different ways.
   */
  readonly paymentTriggers: readonly [string, string, string];
  /** The middle trigger on its own, for prose that quotes it: "a development milestone". */
  readonly milestoneTrigger: string;
  readonly ownership: string;
  /** Carries `{days}`. */
  readonly validity: string;
}

/** A priced condition's option, as the estimator and the pricing page name it. */
export interface FactorOptionCopy {
  readonly label: string;
}

export interface FactorGroupCopy {
  readonly label: string;
  readonly options: Readonly<Record<string, FactorOptionCopy>>;
}

export interface FactorCopy {
  readonly groups: Readonly<Record<FactorGroupId, FactorGroupCopy>>;
  /** The delta label for a factor of exactly 1: "no change". */
  readonly noChange: string;
}

export interface ScopeNoteCopy {
  readonly name: string;
  readonly description: string;
}

/**
 * The service investment register: one row per service line. Figures are
 * views; these are the words around them.
 */
export interface InvestmentRowCopy {
  readonly name: string;
  readonly covers: string;
  readonly how: string;
}

export interface InvestmentCopy {
  readonly design: InvestmentRowCopy & {
    /** The figure cell, e.g. "Scoped per project". No number. */
    readonly figure: string;
  };
  readonly development: InvestmentRowCopy;
  readonly audit: InvestmentRowCopy;
  readonly maintenance: InvestmentRowCopy;
  /**
   * A cell's delivery window, carrying `{weeks}`. A template, not a literal,
   * for the same reason the maintenance scope lines are: the weeks come from
   * the service matrix, so no surface can print a window the estimator would
   * not quote.
   */
  readonly weeksValue: string;
}

export interface PricingCopy {
  readonly services: Readonly<Record<ServiceId, ServiceCopy>>;
  /** Complexity band names as they appear in proposals and contracts. */
  readonly bands: Readonly<Record<ComplexityId, string>>;
  readonly maintenance: Readonly<Record<MaintenancePlanId, MaintenanceCopy>>;
  readonly maintenanceTemplates: MaintenanceTemplates;
  readonly consulting: Readonly<Record<ConsultingPackageId, ConsultingCopy>>;
  readonly addons: Readonly<Record<AddonId, AddonCopy>>;
  readonly terms: TermsCopy;
  readonly factors: FactorCopy;
  readonly scopeNotes: Readonly<Record<ScopeNoteId, ScopeNoteCopy>>;
  readonly investment: InvestmentCopy;
}
