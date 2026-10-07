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
  readonly documentName: string;
  readonly name: string;
  readonly description: string;
}

export interface MaintenanceCopy {
  readonly name: string;
  readonly features: readonly string[];
  readonly compare: MaintenanceCompare;
}

export interface MaintenanceCompare {
  readonly bestFor: string;
  readonly monitoring: string;
}

export interface MaintenanceTemplates {
  readonly requestCap: string;
  readonly requestCapPriority: string;
  readonly portal: string;
  readonly overage: string;
  readonly overageShort: string;
  readonly customPrice: string;
  readonly perCycle: Readonly<Record<BillingCycle, string>>;
  readonly perInterval: Readonly<Record<MaintenanceInterval, string>>;
}

export interface ConsultingCopy {
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
  readonly creditLabel: string;
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
  readonly vatExcluded: string;
  readonly revisionLabel: string;
  readonly revisionNote: string;
  readonly addonLabel: string;
  readonly addonNote: string;
  readonly costBasisLabel: string;
  readonly markupLabel: string;
  readonly totalLabel: string;
  readonly pendingLabel: string;
  readonly paymentTriggers: readonly [string, string, string];
  readonly milestoneTrigger: string;
  readonly ownership: string;
  readonly validity: string;
}

export interface FactorOptionCopy {
  readonly label: string;
}

export interface FactorGroupCopy {
  readonly label: string;
  readonly options: Readonly<Record<string, FactorOptionCopy>>;
}

export interface FactorCopy {
  readonly groups: Readonly<Record<FactorGroupId, FactorGroupCopy>>;
  readonly noChange: string;
}

export interface ScopeNoteCopy {
  readonly name: string;
  readonly description: string;
}

export interface InvestmentRowCopy {
  readonly name: string;
  readonly covers: string;
  readonly how: string;
}

export interface InvestmentCopy {
  readonly design: InvestmentRowCopy & {
    readonly figure: string;
  };
  readonly development: InvestmentRowCopy;
  readonly audit: InvestmentRowCopy;
  readonly maintenance: InvestmentRowCopy;
  readonly weeksValue: string;
}

export interface BudgetCopy {
  /** Label for the "not sure yet" budget answer. */
  readonly unsure: string;
}

export interface PricingCopy {
  readonly services: Readonly<Record<ServiceId, ServiceCopy>>;
  readonly bands: Readonly<Record<ComplexityId, string>>;
  readonly budget: BudgetCopy;
  readonly maintenance: Readonly<Record<MaintenancePlanId, MaintenanceCopy>>;
  readonly maintenanceTemplates: MaintenanceTemplates;
  readonly consulting: Readonly<Record<ConsultingPackageId, ConsultingCopy>>;
  readonly addons: Readonly<Record<AddonId, AddonCopy>>;
  readonly terms: TermsCopy;
  readonly factors: FactorCopy;
  readonly scopeNotes: Readonly<Record<ScopeNoteId, ScopeNoteCopy>>;
  readonly investment: InvestmentCopy;
}
