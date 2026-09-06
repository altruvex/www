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

/**
 * Third-party pass-through items.
 *
 * The commercial rule these types enforce: an add-on is what Altruvex pays a
 * third party, plus a stated margin, and the client always sees both halves.
 * `displayAsLineItem` is typed as the literal `true` so a renderer cannot fold
 * one into a bundled total — the only way to hide an add-on would be to change
 * this type, which is a visible decision rather than a quiet one.
 *
 * `costBasis` is `null` where the real supplier figure is not yet on file.
 * That is deliberate and load-bearing: the previous `HOSTING_RENEWAL` table
 * held retail figures with no recorded cost, so seeding `costBasis` from it
 * would have invented a margin and published it as fact. `computeAddonPrice`
 * refuses to price a null-basis add-on rather than defaulting it to zero, so
 * an unpriced add-on fails loudly instead of quoting a client 0 EGP.
 *
 * TODO(pending real cost basis): supply actual supplier costs for `domain`,
 * `hosting`, and `business-mail`, then set `markupValue` per item. Until then
 * these three are `planned` and are filtered off every client surface.
 */
export interface Addon extends Versioned {
  readonly id: AddonId;
  readonly category: AddonCategory;
  readonly status: EntityStatus;
  readonly billingCycle: BillingCycle;
  /** EGP Altruvex pays the third party. Null = not yet supplied. */
  readonly costBasis: Amount | null;
  readonly markupType: MarkupType;
  /** Percent (e.g. 20 for 20%) or a flat EGP amount, per `markupType`. */
  readonly markupValue: number;
  /** Always a discrete, labelled line item. Never merged into a total. */
  readonly displayAsLineItem: true;
  /**
   * Add-ons this SKU bundles for invoicing convenience. A bundle never
   * replaces its members in the schema — the parts stay individually priced
   * and individually rendered; only the invoice is consolidated.
   */
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
  /**
   * Roadmap placeholder. Renewal tracking and consolidated billing for the
   * three pass-through items above.
   *
   * Schema and composition only — no renewal automation, no scheduled job, no
   * billing consolidation is wired in this pass, by design. It renders in
   * admin with a SOON badge and is filtered off every client-facing surface by
   * `publicAddons()` until its status becomes `active`.
   */
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

/** Add-ons a client may see. Everything `planned` stays internal. */
export function publicAddons(): readonly Addon[] {
  return Object.values(ADDONS).filter((addon) => addon.status === "active");
}

/** Everything admin may see, including roadmap placeholders. */
export function allAddons(): readonly Addon[] {
  return Object.values(ADDONS);
}
