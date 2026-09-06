#!/usr/bin/env node
/**
 * Rendered-output verification.
 *
 * The literal guard proves no surface holds its own price and the parity report
 * proves the schema is self-consistent. Neither can prove what a visitor
 * actually sees, and the defects this refactor fixed were visible ones — a card
 * disagreeing with the estimator it links to, an Arabic page quoting 25% more
 * than the English. Only a browser settles that, so this drives a real build in
 * both locales and asserts on rendered text.
 *
 * Requires a running production build. Not part of `bun run validate` because
 * it needs a server; run it before shipping a pricing change.
 */
import { chromium } from "playwright-core";

// Point at a running production build: `bun run build && bun run start` in
// apps/www, then `node scripts/verify-rendered-pricing.mjs`.
const B = process.env.PRICING_VERIFY_URL ?? "http://localhost:3000";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();
let fails = 0;
const check = (cond, what) => { console.log(`${cond ? "PASS" : "FAIL"}  ${what}`); if (!cond) fails++; };

for (const locale of ["en", "ar"]) {
  console.log(`\n===== ${locale.toUpperCase()} =====`);
  await page.goto(`${B}/${locale}/transparency`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const dir = await page.locator("html").getAttribute("dir");
  check(dir === (locale === "ar" ? "rtl" : "ltr"), `html dir = ${dir}`);
  const terms = locale === "en"
    ? ["Commercial terms", "excluding VAT", "VAT at 14%", "800 EGP/hr", "50 EGP/USD", "reviewed quarterly", "Pass-through items"]
    : ["الشروط التجارية", "ضريبة القيمة المضافة", "٨٠٠ جنيه", "٥٠ جنيه للدولار", "بنود التمرير"];
  const bodyLower = body.toLowerCase();
  for (const t of terms) check(bodyLower.includes(t.toLowerCase()), `/transparency contains "${t}"`);

  await page.goto(`${B}/${locale}/pricing`, { waitUntil: "networkidle" });
  const pricing = await page.locator("body").innerText();
  const want = locale === "en"
    ? ["35,000 – 70,000 EGP", "70,000 – 140,000 EGP", "95,000 – 180,000 EGP", "From 280,000 EGP", "From 35,000 EGP"]
    : ["٣٥٬٠٠٠ – ٧٠٬٠٠٠ جنيه", "٧٠٬٠٠٠ – ١٤٠٬٠٠٠ جنيه", "٩٥٬٠٠٠ – ١٨٠٬٠٠٠ جنيه", "تبدأ من ٢٨٠٬٠٠٠ جنيه"];
  const pricingLower = pricing.toLowerCase();
  for (const t of want) check(pricingLower.includes(t.toLowerCase()), `/pricing shows "${t}"`);
  for (const stale of ["22,000", "45,000", "٢٢٬٠٠٠", "٤٥٬٠٠٠"])
    check(!pricing.includes(stale), `/pricing free of stale "${stale}"`);

  await page.goto(`${B}/${locale}/services/maintenance`, { waitUntil: "networkidle" });
  const m = await page.locator("body").innerText();
  const plans = locale === "en"
    ? ["2,500 EGP", "5,000 EGP", "Custom", "Up to 2 edit requests", "Up to 4 edit requests", "Client Portal access", "800 EGP/hr"]
    : ["٢٬٥٠٠ جنيه", "٥٬٠٠٠ جنيه", "مخصص", "طلبات تعديل", "بوابة العميل", "٨٠٠ جنيه"];
  for (const t of plans) check(m.includes(t), `/maintenance shows "${t}"`);
  for (const stale of ["2,000 EGP", "4,000 EGP", "١٠٬٠٠٠ جنيه", "١٠٫٠٠٠ جنيه", "30 minutes", "2 hours"])
    check(!m.includes(stale), `/maintenance free of stale "${stale}"`);

  await page.goto(`${B}/${locale}/services/consulting`, { waitUntil: "networkidle" });
  const c = await page.locator("body").innerText();
  check(c.includes(locale === "en" ? "15,000 EGP" : "١٥٬٠٠٠ جنيه"), `/consulting audit price`);
  if (locale === "ar") check(!c.includes("١٥٫٠٠٠"), `/consulting AR uses thousands separator, not decimal`);
}

// The tier card and the estimator it links to must agree.
console.log("\n===== deep-link agreement =====");
for (const [tier, lo, hi] of [["essential","35,000","70,000"], ["professional","70,000","140,000"], ["ecommerce","95,000","180,000"], ["flagship","280,000","450,000"]]) {
  await page.goto(`${B}/en/pricing`, { waitUntil: "networkidle" });
  const href = await page.locator(`a[href*="tier=${tier}"]`).first().getAttribute("href");
  await page.goto(`${B}/en${href}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const t = await page.locator("body").innerText();
  check(t.includes(lo) && t.includes(hi), `${tier}: estimator quotes ${lo}–${hi} (href ${href})`);
}

for (const [loc, faqWant, artWant] of [
  ["en", ["2,500 EGP/month", "5,000 EGP/month"], ["35,000 – 70,000 EGP", "Projects start at 35,000 EGP."]],
  ["ar", ["٢٬٥٠٠ جنيه/شهر", "٥٬٠٠٠ جنيه/شهر"], ["٣٥٬٠٠٠ – ٧٠٬٠٠٠ جنيه", "تبدأ المشاريع من ٣٥٬٠٠٠ جنيه."]],
]) {
  await page.goto(`${B}/${loc}/faq`, { waitUntil: "networkidle" });
  // Open every accordion item so answer text is in the DOM.
  const triggers = await page.locator("button[data-slot='accordion-trigger'], button[aria-expanded]").all();
  for (const t of triggers) { try { await t.clicheck({ timeout: 1500 }); } catch {} }
  await page.waitForTimeout(600);
  const faq = (await page.locator("body").innerText()).toLowerCase();
  for (const w of faqWant) check(faq.includes(w.toLowerCase()), `${loc} /faq token filled: "${w}"`);
  check(!faq.includes("{maintenanceessential}"), `${loc} /faq has no unfilled token`);

  await page.goto(`${B}/${loc}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const home = (await page.locator("body").innerText()).toLowerCase();
  for (const w of artWant) check(home.includes(w.toLowerCase()), `${loc} / quote artifact: "${w}"`);
  check(!home.includes("{essentialrange}") && !home.includes("{minimumengagement}"), `${loc} / has no unfilled token`);
}

await browser.close();
console.log(fails === 0 ? "\nALL BROWSER CHECKS PASSED" : `\n${fails} FAILED`);
process.exit(fails ? 1 : 0);
