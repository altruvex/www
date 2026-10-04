import type { AddonId } from "./ids";
import type { Amount, BillingCycle, EntityStatus, Versioned } from "./types";

export const ADDON_CATEGORIES = [
  "domain",
  "hosting",
  "business_mail",
  "other",
] as const;
export type AddonCategory = (typeof ADDON_CATEGORIES)[number];

export type MarkupType = "percent" | "fixed";

export interface Addon extends Versioned {
  readonly id: AddonId;
  readonly category: AddonCategory;
  readonly status: EntityStatus;
  readonly billingCycle: BillingCycle;
  readonly costBasis: Amount | null;
  readonly markupType: MarkupType;
  readonly markupValue: number;
  readonly displayAsLineItem: true;
  readonly bundles: readonly AddonId[];
}

export const ADDONS: Readonly<Record<AddonId, Addon>> = {
  domain: {
    id: "domain",
    category: "domain",
    status: "planned",
    billingCycle: "annual",
    costBasis: null,
    markupType: "percent",
    markupValue: 20,
    displayAsLineItem: true,
    bundles: [],
    version: 1,
    lastUpdated: "2026-09-06",
  },
  hosting: {
    id: "hosting",
    category: "hosting",
    status: "planned",
    billingCycle: "annual",
    costBasis: null,
    markupType: "percent",
    markupValue: 20,
    displayAsLineItem: true,
    bundles: [],
    version: 1,
    lastUpdated: "2026-09-06",
  },
  "business-mail": {
    id: "business-mail",
    category: "business_mail",
    status: "planned",
    billingCycle: "annual",
    costBasis: null,
    markupType: "percent",
    markupValue: 20,
    displayAsLineItem: true,
    bundles: [],
    version: 1,
    lastUpdated: "2026-09-06",
  },
  "managed-bundle": {
    id: "managed-bundle",
    category: "other",
    status: "planned",
    billingCycle: "annual",
    costBasis: null,
    markupType: "fixed",
    markupValue: 0,
    displayAsLineItem: true,
    bundles: ["domain", "hosting", "business-mail"],
    version: 1,
    lastUpdated: "2026-09-06",
  },
};
