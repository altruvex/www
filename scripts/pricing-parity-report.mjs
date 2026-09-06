#!/usr/bin/env node
/**
 * Cross-surface parity report.
 *
 * Confirms every surface resolves the same figure for the same entity, and
 * that the estimator lands on the cell each tier card advertises. The guard
 * proves no surface holds its own number; this proves the numbers they all
 * share are the right ones and internally consistent.
 */
import {
  ADDONS, allAddonViews, calculateEstimate, COMMERCIAL_TERMS, computeAddonPrice,
  consultingView, MAINTENANCE_PLANS, maintenanceViews, minimumEngagement,
  ORDERED_TIERS, PRICING_VERSION, publicAddonViews, resolveTierToken, SERVICES,
  termsView, tierEstimatorQuery, tierPriceRange, TIERS, tierViews,
  USD_EXCHANGE_RATE,
} from "@repo/pricing-schema";

const LOCALES = ["en", "ar"];
let failures = 0;
const check = (ok, what) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

console.log(`\nPricing parity report — schema version ${PRICING_VERSION}\n${"=".repeat(64)}`);

console.log("\n[1] Tier card ↔ estimator agreement");
for (const tier of ORDERED_TIERS) {
  const cell = tierPriceRange(tier.id);
  const est = calculateEstimate({
    serviceId: tier.serviceId,
    complexityId: tier.complexityId,
    timeline: "standard",
  });
  check(
    est.minPrice === cell.min && est.maxPrice === cell.max,
    `${tier.id}: card ${cell.min}–${cell.max} = estimator ${est.minPrice}–${est.maxPrice}`,
  );
  const query = tierEstimatorQuery(tier.id);
  const token = new URLSearchParams(query).get("tier");
  const service = new URLSearchParams(query).get("projectType");
  check(
    resolveTierToken(token) === tier.id && service === tier.serviceId,
    `${tier.id}: deep link ${query} resolves to its own cell`,
  );
}

console.log("\n[2] Same entity renders identically across locales (figures only)");
const digits = (s) => s.replace(/[^0-9٠-٩]/gu, "").replace(/[٠-٩]/gu, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
for (const tier of ORDERED_TIERS) {
  const [en, ar] = LOCALES.map((l) => tierViews(l).find((t) => t.id === tier.id).priceLabel);
  check(digits(en) === digits(ar), `${tier.id}: "${en}" ≡ "${ar}"`);
}
for (const id of Object.keys(MAINTENANCE_PLANS)) {
  const [en, ar] = LOCALES.map((l) => maintenanceViews(l).find((p) => p.id === id));
  check(digits(en.priceLabel) === digits(ar.priceLabel), `maintenance ${id}: "${en.priceLabel}" ≡ "${ar.priceLabel}"`);
  check(en.isCustomQuote === ar.isCustomQuote, `maintenance ${id}: quote-only flag matches across locales`);
}
{
  const [en, ar] = LOCALES.map((l) => consultingView("technical-audit", l).priceLabel);
  check(digits(en) === digits(ar), `technical-audit: "${en}" ≡ "${ar}"`);
}

console.log("\n[3] Enterprise maintenance is quote-only in every locale");
for (const l of LOCALES) {
  const ent = maintenanceViews(l).find((p) => p.id === "enterprise");
  check(ent.isCustomQuote && digits(ent.priceLabel) === "", `${l}: "${ent.priceLabel}" carries no figure`);
}

console.log("\n[4] Published terms reach the client before contract stage");
for (const l of LOCALES) {
  const t = termsView(l);
  check(t.vatNote.includes(l === "en" ? "14" : "١٤"), `${l}: VAT rate published`);
  check(digits(t.revisionNote).includes("800"), `${l}: revision rate published`);
  check(digits(t.usdNote).includes("50"), `${l}: USD rate published`);
  check(t.usdNote.includes(USD_EXCHANGE_RATE.reviewedOn), `${l}: USD review date published`);
}

console.log("\n[5] Add-ons are discrete line items, never bundled");
for (const addon of Object.values(ADDONS)) {
  check(addon.displayAsLineItem === true, `${addon.id}: displayAsLineItem`);
}
check(
  publicAddonViews("en").length === 0,
  `no add-on is client-visible while its cost basis is pending (${allAddonViews("en").length} exist internally)`,
);
check(
  ADDONS["managed-bundle"].status === "planned",
  "Managed bundle is planned-only and filtered off client surfaces",
);
check(
  ADDONS["managed-bundle"].bundles.length === 3 &&
    ADDONS["managed-bundle"].bundles.every((id) => ADDONS[id].displayAsLineItem),
  "Managed bundle composes its members without collapsing them",
);
check(
  Object.values(ADDONS).every((a) => a.costBasis !== null || computeAddonPrice(a) === null),
  "an add-on with no cost basis refuses to price rather than quoting zero",
);

console.log("\n[6] Internal margin data is not exposed by any view");
const serialized = JSON.stringify([
  ...LOCALES.flatMap((l) => [tierViews(l), maintenanceViews(l), allAddonViews(l), termsView(l), consultingView("technical-audit", l)]),
]);
for (const plan of Object.values(MAINTENANCE_PLANS)) {
  if (plan.internalHourEquivalent === null) continue;
  const cap = plan.requestsPerCycle;
  check(
    !serialized.includes(`"internalHourEquivalent"`),
    `${plan.id}: hour-equivalent (${plan.internalHourEquivalent}h behind a ${cap}-request cap) absent from views`,
  );
}

console.log("\n[7] Engagement floor matches the lowest published cell");
const floor = minimumEngagement();
const lowest = Math.min(...Object.values(SERVICES).map((s) => s.price.basic.min));
check(floor === lowest, `floor ${floor} = lowest cell ${lowest}`);

console.log("\n[8] Milestone split is coherent");
check(
  COMMERCIAL_TERMS.paymentSplit.reduce((a, b) => a + b, 0) === 100,
  `payment split ${COMMERCIAL_TERMS.paymentSplit.join("/")} sums to 100`,
);

console.log("\n" + "=".repeat(64));
if (failures === 0) {
  console.log("All surfaces agree. 0 discrepancies.\n");
  process.exit(0);
}
console.log(`${failures} discrepancies.\n`);
process.exit(1);
