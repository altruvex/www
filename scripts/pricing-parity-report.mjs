#!/usr/bin/env node
import {
  ADDONS, allAddonViews, calculateEstimate, COMMERCIAL_TERMS, COMPLEXITY_IDS,
  computeAddonPrice, consultingView, DEFAULT_PRICING, estimateSpan,
  FACTOR_GROUPS, formatFrom, formatRange, formatWeeks, investmentMatrixView,
  MAINTENANCE_PLANS, maintenanceViews, MAX_DELIVERY_WEEKS, minimumEngagement,
  minimumEngagementFrom, paymentScheduleView, PRICING_VERSION, publicAddonViews,
  SERVICE_IDS, serviceInvestmentViews, SERVICES, termsView, USD_EXCHANGE_RATE,
  workedExampleView,
} from "@repo/pricing-schema";

const LOCALES = ["en", "ar"];
let failures = 0;
const check = (ok, what) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};
const digits = (s) => s.replace(/[^0-9٠-٩]/gu, "").replace(/[٠-٩]/gu, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

console.log(`\nPricing parity report — schema version ${PRICING_VERSION}\n${"=".repeat(64)}`);

console.log("\n[1] Published matrix cell ↔ estimator agreement");
const cells = SERVICE_IDS.flatMap((serviceId) =>
  COMPLEXITY_IDS.map((complexityId) => ({
    serviceId,
    complexityId,
    price: SERVICES[serviceId].price[complexityId],
    weeks: SERVICES[serviceId].weeks[complexityId],
  })),
);
for (const cell of cells) {
  const est = calculateEstimate({
    serviceId: cell.serviceId,
    complexityId: cell.complexityId,
    timeline: "standard",
  });
  check(
    est.minPrice === cell.price.min && est.maxPrice === cell.price.max,
    `${cell.serviceId}/${cell.complexityId}: cell ${cell.price.min}–${cell.price.max} = estimator ${est.minPrice}–${est.maxPrice}`,
  );
  for (const l of LOCALES) {
    const row = investmentMatrixView(l).rows.find((r) => r.serviceId === cell.serviceId);
    const view = row.cells.find((c) => c.complexityId === cell.complexityId);
    check(
      view.priceLabel === formatRange(cell.price, l),
      `${l} ${cell.serviceId}/${cell.complexityId}: matrix label "${view.priceLabel}" is the cell's range`,
    );
    check(
      view.weeksLabel.includes(formatWeeks(cell.weeks.min, cell.weeks.max, l)),
      `${l} ${cell.serviceId}/${cell.complexityId}: matrix weeks "${view.weeksLabel}" is the cell's window`,
    );
  }
}

console.log("\n[2] Opening estimator span is the envelope of every condition");
{
  const span = estimateSpan({});
  const floor = minimumEngagementFrom(DEFAULT_PRICING);
  const envelope = { minPrice: Infinity, maxPrice: 0, minWeeks: Infinity, maxWeeks: 0 };
  let combos = 0;
  const underFloor = [];
  const overCeiling = [];
  for (const cell of cells)
    for (const timeline of FACTOR_GROUPS.timeline.optionIds)
      for (const brandIdentity of FACTOR_GROUPS.brand.optionIds)
        for (const contentReadiness of FACTOR_GROUPS.content.optionIds) {
          const key = `${cell.serviceId}/${cell.complexityId}/${timeline}/${brandIdentity}/${contentReadiness}`;
          const est = calculateEstimate({ serviceId: cell.serviceId, complexityId: cell.complexityId, timeline, brandIdentity, contentReadiness });
          combos++;
          envelope.minPrice = Math.min(envelope.minPrice, est.minPrice);
          envelope.maxPrice = Math.max(envelope.maxPrice, est.maxPrice);
          envelope.minWeeks = Math.min(envelope.minWeeks, est.minWeeks);
          envelope.maxWeeks = Math.max(envelope.maxWeeks, est.maxWeeks);
          if (est.minPrice < floor) underFloor.push(key);
          if (est.maxWeeks > MAX_DELIVERY_WEEKS) overCeiling.push(key);
        }
  check(underFloor.length === 0, `no estimate quotes under the floor ${floor}${underFloor.length ? `: ${underFloor.join(", ")}` : ""}`);
  check(overCeiling.length === 0, `no estimate exceeds the ${MAX_DELIVERY_WEEKS}-week ceiling${overCeiling.length ? `: ${overCeiling.join(", ")}` : ""}`);
  check(
    JSON.stringify(span) === JSON.stringify(envelope),
    `estimateSpan({}) ${span.minPrice}–${span.maxPrice} EGP, ${span.minWeeks}–${span.maxWeeks} weeks = envelope of ${combos} estimates`,
  );
  check(span.minPrice === floor, `span opens at the engagement floor ${floor}`);
  check(
    cells.every((c) => c.price.min >= span.minPrice && c.price.max <= span.maxPrice),
    "every published cell lies inside the opening span",
  );
}

console.log("\n[3] Service investment register resolves from the matrix");
for (const l of LOCALES) {
  const rows = Object.fromEntries(serviceInvestmentViews(l).map((r) => [r.id, r]));
  const floor = minimumEngagementFrom(DEFAULT_PRICING);
  check(rows.development.figureLabel === formatFrom(floor, l), `${l}: development "${rows.development.figureLabel}" = From ${floor}`);
  check(rows.development.matrix !== null && rows.development.matrix.cellCount === cells.length, `${l}: development discloses all ${cells.length} cells`);
  check(rows.design.isScopedPerProject && digits(rows.design.figureLabel) === "", `${l}: design "${rows.design.figureLabel}" carries no figure`);
  check(digits(rows.audit.figureLabel) === digits(consultingView("technical-audit", l).priceLabel), `${l}: audit "${rows.audit.figureLabel}" = the audit package fee`);
  const lowestPlan = Math.min(...Object.values(MAINTENANCE_PLANS).filter((p) => p.status === "active" && p.price !== null).map((p) => p.price));
  check(digits(rows.maintenance.figureLabel) === String(lowestPlan), `${l}: maintenance "${rows.maintenance.figureLabel}" = lowest priced plan ${lowestPlan}`);
}

console.log("\n[4] Same entity renders identically across locales (figures only)");
for (const cell of cells) {
  const [en, ar] = LOCALES.map((l) =>
    investmentMatrixView(l).rows.find((r) => r.serviceId === cell.serviceId).cells.find((c) => c.complexityId === cell.complexityId),
  );
  check(digits(en.priceLabel) === digits(ar.priceLabel), `${cell.serviceId}/${cell.complexityId}: "${en.priceLabel}" ≡ "${ar.priceLabel}"`);
  check(digits(en.weeksLabel) === digits(ar.weeksLabel), `${cell.serviceId}/${cell.complexityId}: "${en.weeksLabel}" ≡ "${ar.weeksLabel}"`);
}
{
  const [en, ar] = LOCALES.map((l) => serviceInvestmentViews(l));
  for (const [i, row] of en.entries()) {
    check(digits(row.figureLabel) === digits(ar[i].figureLabel), `register ${row.id}: "${row.figureLabel}" ≡ "${ar[i].figureLabel}"`);
  }
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
{
  const [en, ar] = LOCALES.map((l) => paymentScheduleView(l));
  check(
    en.milestones.every((m, i) => m.percent === ar.milestones[i].percent && digits(m.percentLabel) === digits(ar.milestones[i].percentLabel)),
    `payment schedule: ${en.milestones.map((m) => m.percentLabel).join("/")} ≡ ${ar.milestones.map((m) => m.percentLabel).join("/")}`,
  );
}

console.log("\n[5] Enterprise maintenance is quote-only in every locale");
for (const l of LOCALES) {
  const ent = maintenanceViews(l).find((p) => p.id === "enterprise");
  check(ent.isCustomQuote && digits(ent.priceLabel) === "", `${l}: "${ent.priceLabel}" carries no figure`);
}

console.log("\n[6] Published terms reach the client before contract stage");
for (const l of LOCALES) {
  const t = termsView(l);
  check(t.vatNote.includes("14"), `${l}: VAT rate published`);
  check(digits(t.revisionNote).includes("800"), `${l}: revision rate published`);
  check(digits(t.usdNote).includes("50"), `${l}: USD rate published`);
  check(t.usdNote.includes(USD_EXCHANGE_RATE.reviewedOn), `${l}: USD review date published`);
}

console.log("\n[7] Add-ons are discrete line items, never bundled");
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

console.log("\n[8] Internal margin data is not exposed by any view");
const serialized = JSON.stringify([
  ...LOCALES.flatMap((l) => [
    investmentMatrixView(l), serviceInvestmentViews(l), paymentScheduleView(l), workedExampleView(l),
    maintenanceViews(l), allAddonViews(l), termsView(l), consultingView("technical-audit", l),
  ]),
]);
for (const plan of Object.values(MAINTENANCE_PLANS)) {
  if (plan.internalHourEquivalent === null) continue;
  const cap = plan.requestsPerCycle;
  check(
    !serialized.includes(`"internalHourEquivalent"`),
    `${plan.id}: hour-equivalent (${plan.internalHourEquivalent}h behind a ${cap}-request cap) absent from views`,
  );
}

console.log("\n[9] Engagement floor matches the lowest published cell");
const floor = minimumEngagement();
const lowest = Math.min(...Object.values(SERVICES).map((s) => s.price.basic.min));
check(floor === lowest, `floor ${floor} = lowest cell ${lowest}`);
check(floor === minimumEngagementFrom(DEFAULT_PRICING), `floor ${floor} = resolved-set floor ${minimumEngagementFrom(DEFAULT_PRICING)}`);

console.log("\n[10] Milestone split is coherent");
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
