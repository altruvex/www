#!/usr/bin/env node
import {
  DEFAULT_PRICING,
  consultingView,
  formatMoney,
  formatNumber,
  maintenanceViews,
  minimumEngagementFrom,
  paymentScheduleView,
  pricingTokens,
} from "@repo/pricing-schema";

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error(
    "playwright-core is not installed — it is deliberately not a repo dependency.\n" +
      "Run `bun add -d playwright-core` to use this check, and remove it afterwards.",
  );
  process.exit(2);
}

const B = process.env.PRICING_VERIFY_URL ?? "http://localhost:3000";
let browser;
try {
  browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
} catch (err) {
  console.error(
    `Could not launch Chromium: ${err.message}\n` +
      "Set CHROMIUM_PATH to an existing browser binary, or run `npx playwright install chromium`.",
  );
  process.exit(2);
}
const page = await browser.newPage();
let fails = 0;
const check = (cond, what) => { console.log(`${cond ? "PASS" : "FAIL"}  ${what}`); if (!cond) fails++; };

const norm = (text) =>
  text
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace(/[\s\u00a0\u202f]+/g, " ")
    .toLowerCase();
const has = (haystack, needle) => norm(haystack).includes(norm(needle));
const bodyText = () => page.locator("body").innerText();
const PRICING = DEFAULT_PRICING;
const TIER_WORDS = ["Flagship", "Focused Website", "Marketing System", "Most common"];
const UNFILLED = /\{(payment|milestone|proposal|vat|audit|maintenance|warranty|essential|minimum|revision)[A-Za-z]*\}/i;

for (const locale of ["en", "ar"]) {
  const L = locale;
  const tokens = pricingTokens(L, PRICING);
  const schedule = paymentScheduleView(L, PRICING);
  const audit = consultingView("technical-audit", L, PRICING);
  const plans = maintenanceViews(L, PRICING);
  const floor = formatMoney(minimumEngagementFrom(PRICING), L);

  console.log(`\n===== ${L.toUpperCase()} =====`);
  await page.goto(`${B}/${L}/transparency`, { waitUntil: "networkidle" });
  const dir = await page.locator("html").getAttribute("dir");
  check(dir === (L === "ar" ? "rtl" : "ltr"), `html dir = ${dir}`);
  const toPricing = await page.locator('a[href$="/pricing"]').count();
  check(toPricing > 0, "/transparency links to /pricing for the terms");
  const tp = await bodyText();
  for (const w of TIER_WORDS) check(!has(tp, w), `/transparency free of "${w}"`);

  await page.goto(`${B}/${L}/pricing`, { waitUntil: "networkidle" });
  const pricing = await bodyText();
  check(has(pricing, floor), `/pricing shows the floor "${floor}"`);
  check(has(pricing, audit.priceLabel), `/pricing shows the audit fee "${audit.priceLabel}"`);
  check(has(pricing, schedule.vatExcluded), `/pricing shows the VAT sentence "${schedule.vatExcluded}"`);
  for (const m of schedule.milestones)
    check(has(pricing, m.percentLabel), `/pricing shows the payment share "${m.percentLabel}"`);
  for (const w of TIER_WORDS) check(!has(pricing, w), `/pricing free of "${w}"`);

  await page.goto(`${B}/${L}/services/maintenance`, { waitUntil: "networkidle" });
  const m = await bodyText();
  for (const plan of plans) {
    check(has(m, plan.priceLabel), `/maintenance shows ${plan.id} "${plan.priceLabel}"`);
    if (plan.requestsPerCycle !== null) {
      const cap = plan.features.find((f) => f.includes(formatNumber(plan.requestsPerCycle, L)));
      if (cap) check(has(m, cap), `/maintenance shows ${plan.id} allowance "${cap}"`);
    }
  }
  check(has(m, tokens.revisionRate), `/maintenance shows the overage rate "${tokens.revisionRate}"`);
  for (const stale of ["2,000 EGP", "4,000 EGP", "١٠٬٠٠٠ جنيه", "١٠٫٠٠٠ جنيه", "30 minutes", "2 hours"])
    check(!m.includes(stale), `/maintenance free of stale "${stale}"`);

  await page.goto(`${B}/${L}/services/consulting`, { waitUntil: "networkidle" });
  const c = await bodyText();
  check(has(c, audit.priceLabel), `/consulting audit price "${audit.priceLabel}"`);
  if (audit.creditAmountLabel)
    check(has(c, audit.creditAmountLabel), `/consulting audit credit "${audit.creditAmountLabel}"`);
  if (L === "ar") check(!/[٠-٩]٫٠٠٠/u.test(c), "/consulting AR uses thousands separator, not decimal");

  await page.goto(`${B}/${L}/terms`, { waitUntil: "networkidle" });
  const terms = await bodyText();
  for (const t of [tokens.paymentStart, tokens.paymentMilestone, tokens.paymentFinal, tokens.milestoneTrigger])
    check(has(terms, t), `/terms payment schedule shows "${t}"`);
  check(!UNFILLED.test(terms), "/terms has no unfilled token");

  await page.goto(`${B}/${L}/faq`, { waitUntil: "networkidle" });
  const triggers = await page.locator("button[data-slot='accordion-trigger'], button[aria-expanded]").all();
  for (const t of triggers) { try { await t.click({ timeout: 1500 }); } catch {} }
  await page.waitForTimeout(600);
  const faq = await bodyText();
  const perMonth = L === "en" ? "/month" : "/شهر";
  for (const w of [tokens.maintenanceEssential, tokens.maintenanceProfessional])
    check(has(faq, `${w}${perMonth}`), `${L} /faq token filled: "${w}${perMonth}"`);
  for (const w of [tokens.paymentMilestone, tokens.milestoneTrigger])
    check(has(faq, w), `${L} /faq payment token filled: "${w}"`);
  check(!UNFILLED.test(faq), `${L} /faq has no unfilled token`);
  for (const w of [...TIER_WORDS, "Essential tier"]) check(!has(faq, w), `${L} /faq free of "${w}"`);

  await page.goto(`${B}/${L}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const home = await bodyText();
  check(has(home, floor), `${L} / shows the floor "${floor}"`);
  check(!UNFILLED.test(home) && !/\{(essentialRange|minimumEngagement)\}/.test(home), `${L} / has no unfilled token`);
  for (const w of TIER_WORDS) check(!has(home, w), `${L} / free of "${w}"`);
}

await browser.close();
console.log(fails === 0 ? "\nALL BROWSER CHECKS PASSED" : `\n${fails} FAILED`);
process.exit(fails ? 1 : 0);
