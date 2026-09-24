/**
 * Checks for client services: renewal arithmetic, alert thresholds and their
 * idempotency keys, the proposal schema's services block, and both documents
 * that print them.
 *
 * Needs no database. The renewal sweep's only database-facing guarantee — one
 * notification per (user, key) — is the unique index; what this pins is that
 * the key is right, because a key that changes every run notifies every run and
 * a key that never changes notifies once in the service's life.
 *
 *   cd apps/admin && bun run verify:services
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildContractDocx } from "../lib/contract-builder";
import { buildProposalPptx } from "../lib/proposal-builder";
import { buildDefaultProposalContent } from "../lib/proposal-defaults";
import { ProposalQaError } from "../lib/proposal-qa";
import { investmentTotal, netTotal, validateProposalContent } from "../lib/proposal-schema";
import { normaliseDomain, parseRdapDomain } from "../lib/rdap";
import { reminderDraftFor, whatsappLink } from "../lib/service-reminder";
import {
  annualised,
  remindedThisCycle,
  termBilling,
  crossedThreshold,
  daysUntilExpiry,
  nextExpiry,
  renewalAlertKey,
  serviceState,
} from "../lib/service-lifecycle";

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(`${s}T12:00:00.000Z`);
const DAY = 86_400_000;
const now = utc("2026-09-14");
const inDays = (n: number) => new Date(now.getTime() + n * DAY);

/** One entry of an Office file, read with the system unzip — no zip dependency. */
const scratch = mkdtempSync(join(tmpdir(), "verify-services-"));
function readZipEntry(buffer: Buffer, entry: string): string {
  const file = join(scratch, `${Math.random().toString(36).slice(2)}.zip`);
  writeFileSync(file, buffer);
  return execFileSync("unzip", ["-p", file, entry], { maxBuffer: 16 * 1024 * 1024 }).toString();
}

async function main() {
  console.log("\nDerived state");
  check(serviceState({ status: "PENDING", expiresAt: null }, now) === "pending", "pending has no expiry and stays pending");
  check(serviceState({ status: "ACTIVE", expiresAt: null }, now) === "pending", "active without a date reads as pending, never invents one");
  check(serviceState({ status: "ACTIVE", expiresAt: inDays(90) }, now) === "active", "90 days out is active");
  check(serviceState({ status: "ACTIVE", expiresAt: inDays(30) }, now) === "renewing-soon", "30 days out is renewing soon");
  check(serviceState({ status: "ACTIVE", expiresAt: inDays(7) }, now) === "urgent", "7 days out is urgent");
  check(serviceState({ status: "ACTIVE", expiresAt: new Date(now.getTime() - 1000) }, now) === "expired", "a second past expiry is expired");
  check(serviceState({ status: "CANCELLED", expiresAt: inDays(-100) }, now) === "cancelled", "cancelled wins over a lapsed date");

  console.log("\nAlert thresholds");
  const threshold = (d: number) => crossedThreshold({ status: "ACTIVE", expiresAt: inDays(d) }, now);
  check(threshold(45) === null, "45 days out raises nothing");
  check(threshold(30) === 30, "30 days out raises the 30-day alert");
  check(threshold(20) === 30, "20 days out is still the 30-day alert (14 not yet crossed)");
  check(threshold(14) === 14, "14 days out raises the 14-day alert");
  check(threshold(5) === 7, "5 days out after a gap jumps straight to 7, not a stale 14");
  check(threshold(1) === 1, "tomorrow raises the 1-day alert");
  check(threshold(-3) === 0, "lapsed raises the expiry-day alert");
  check(crossedThreshold({ status: "PENDING", expiresAt: null }, now) === null, "pending raises nothing");
  check(crossedThreshold({ status: "CANCELLED", expiresAt: inDays(2) }, now) === null, "cancelled raises nothing");

  console.log("\nAlert identity");
  const expiry = inDays(7);
  const a = renewalAlertKey("svc-1", expiry, 7);
  check(a === renewalAlertKey("svc-1", new Date(expiry), 7), "same service, cycle and threshold → same key (sweep is idempotent)");
  check(a !== renewalAlertKey("svc-1", expiry, 1), "a tighter threshold is a new alert");
  check(a !== renewalAlertKey("svc-1", nextExpiry({ expiresAt: expiry, termMonths: 12 }, now), 7), "after a renewal the same threshold fires again");
  check(a !== renewalAlertKey("svc-2", expiry, 7), "keys are per service");

  console.log("\nRenewal arithmetic");
  check(iso(nextExpiry({ expiresAt: utc("2026-10-01"), termMonths: 12 }, now)) === "2027-10-01", "renewed early keeps its date, +1 year");
  check(iso(nextExpiry({ expiresAt: utc("2026-09-10"), termMonths: 12 }, now)) === "2027-09-10", "renewed 4 days late does not lose 4 days");
  check(iso(nextExpiry({ expiresAt: utc("2023-01-31"), termMonths: 12 }, now)) === "2027-09-14", "lapsed years ago re-anchors to today");
  check(iso(nextExpiry({ expiresAt: utc("2026-01-31"), termMonths: 1 }, utc("2026-01-20"))) === "2026-02-28", "monthly from the 31st clamps to month length");
  check(iso(nextExpiry({ expiresAt: utc("2026-10-01"), termMonths: 24 }, now)) === "2028-10-01", "a two-year term adds two years");
  check(daysUntilExpiry(inDays(1), now) === 1, "tomorrow is 1 day");
  check(annualised(1200, 24) === 600, "a two-year price annualises to half");
  check(annualised(100, 1) === 1200, "a monthly price annualises ×12");

  console.log("\nBilling a term");
  const term = {
    event: "renew" as const,
    price: 950,
    currency: "EGP",
    firstTermIncluded: false,
    projectId: "p1",
    projectCurrency: "EGP",
    termStart: utc("2026-10-01"),
  };
  const billed = termBilling(term);
  check(billed.bill && billed.amount === 950 && iso(billed.dueDate) === "2026-10-01", "a renewal bills the price, due the day the new term starts");
  check(!termBilling({ ...term, event: "activate", firstTermIncluded: true }).bill, "registering a service whose first term is in the fee opens nothing");
  check(termBilling({ ...term, firstTermIncluded: true }).bill, "…but its renewals are billed");
  check(!termBilling({ ...term, projectId: null, projectCurrency: null }).bill, "no project, no payment schedule to put it on");
  const mismatch = termBilling({ ...term, currency: "USD" });
  check(!mismatch.bill && mismatch.reason.includes("USD") && mismatch.reason.includes("EGP"), "a USD service on an EGP project is refused, never billed as EGP");

  console.log("\nClient reminder");
  const cycle = utc("2026-10-01");
  check(remindedThisCycle({ expiresAt: cycle, reminderSentFor: new Date(cycle) }), "reminded about this expiry counts");
  check(!remindedThisCycle({ expiresAt: utc("2027-10-01"), reminderSentFor: cycle }), "a renewal re-arms the reminder with no reset");
  check(!remindedThisCycle({ expiresAt: cycle, reminderSentFor: null }), "never reminded is not reminded");
  const draft = reminderDraftFor({ kind: "DOMAIN", name: "nile.com", price: 950, currency: "EGP", termMonths: 12, expiresAt: cycle, clientName: "Mona" });
  check(draft.subject.includes("nile.com") && draft.subject.includes("October 1, 2026"), "the subject names the service and the date");
  check(draft.body.includes("/ year") && draft.body.includes("reply to this"), "the body states the price per term and how to decline");
  const wa = whatsappLink("+20 100 123 4567", "Hi Mona");
  check(wa === "https://wa.me/201001234567?text=Hi%20Mona", "the WhatsApp link carries digits only and the encoded text");
  check(whatsappLink("n/a", "x") === null, "no usable phone, no link");

  console.log("\nRegistry (RDAP)");
  check(normaliseDomain("https://www.Nile.com/about") === "www.nile.com", "a pasted URL normalises to its domain");
  check(normaliseDomain("not a domain") === null, "free text is refused before any request");
  check(normaliseDomain("evil.com/../../x?y") === "evil.com", "a path cannot ride along into the lookup URL");
  const record = parseRdapDomain({
    events: [
      { eventAction: "registration", eventDate: "2007-10-09T18:20:50Z" },
      { eventAction: "expiration", eventDate: "2028-10-09T18:20:50Z" },
    ],
    entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "MarkMonitor Inc."]]] }],
  });
  check(record.expiresAt?.toISOString() === "2028-10-09T18:20:50.000Z", "expiry is read from the expiration event");
  check(record.registrar === "MarkMonitor Inc.", "the registrar is read from its vCard");
  check(parseRdapDomain({}).expiresAt === null, "a response with no events yields no date rather than a guess");

  console.log("\nProposal schema");
  const content = buildDefaultProposalContent({
    clientName: "Verify Client",
    clientCompany: "Verify Co",
    projectType: "website",
    currency: "EGP",
    totalPrice: 60000,
    timelineWeeks: 6,
    proposalDate: utc("2026-09-14"),
  });
  check(Array.isArray(content.services) && content.services.length === 0, "new proposals start with no services");

  const legacy = structuredClone(content) as Record<string, unknown>;
  delete legacy.services;
  delete (legacy.labels as Record<string, unknown>).services;
  delete (legacy.labels as Record<string, unknown>).servicesNote;
  const legacyParsed = validateProposalContent(legacy);
  check(legacyParsed.ok && legacyParsed.content!.services.length === 0, "a proposal saved before services existed still parses");

  const withServices = {
    ...content,
    services: [
      { kind: "DOMAIN" as const, name: "verify-co.com", provider: "Namecheap", termMonths: 12, firstTermIncluded: true, price: 950 },
      { kind: "HOSTING" as const, name: "Vercel Pro", provider: "", termMonths: 1, firstTermIncluded: false, price: 1100 },
    ],
  };
  const parsed = validateProposalContent(withServices);
  check(parsed.ok, "services with a price and term validate");
  check(
    netTotal(parsed.content!.investmentItems, parsed.content!.discount) === investmentTotal(content.investmentItems),
    "services never enter the project total",
  );

  const unpriced = validateProposalContent({
    ...withServices,
    services: [{ ...withServices.services[0], price: 0 }],
  });
  check(!unpriced.ok && unpriced.issues.some((i) => i.path === "services.0.price"), "a zero-priced service is refused on its own path");

  console.log("\nDeck");
  const company = {
    phone: "+20 100 000 0000",
    email: "hello@altruvex.com",
    website: "altruvex.com",
    brandColor: "0E51AA",
    brandColorDark: "3687F2",
  };
  const deck = await buildProposalPptx(parsed.content!, company);
  const slide5 = readZipEntry(deck, "ppt/slides/slide5.xml");
  check(Boolean(slide5.includes("verify-co.com")), "slide 5 prints the domain");
  check(Boolean(slide5.includes("RECURRING SERVICES")), "slide 5 prints the services label");
  check(Boolean(slide5.includes("1ST TERM IN FEE")), "a first term in the fee says so");

  const crowded = {
    ...parsed.content!,
    investmentItems: Array.from({ length: 8 }, (_, i) => ({ item: `Item ${i + 1}`, amount: 5000 })),
    services: Array.from({ length: 6 }, (_, i) => ({ ...withServices.services[1], name: `Service ${i + 1}` })),
  };
  let refused: ProposalQaError | null = null;
  try {
    await buildProposalPptx(crowded, company);
  } catch (error) {
    if (error instanceof ProposalQaError) refused = error;
  }
  check(refused?.issues[0]?.path === "services", "a services block that would hit the footer fails generation instead of overflowing");

  console.log("\nContract");
  const contract = {
    id: "c1",
    createdAt: now,
    client: { name: "Verify Client", company: "Verify Co" },
    proposal: {
      projectType: "website",
      currency: "EGP",
      totalPrice: netTotal(parsed.content!.investmentItems, parsed.content!.discount),
      timelineWeeks: 6,
      paymentSplit: { first: 50, second: 30, final: 20 },
      content: parsed.content,
    },
  } as unknown as Parameters<typeof buildContractDocx>[0];
  const documentXml = readZipEntry(await buildContractDocx(contract), "word/document.xml");
  check(documentXml.includes("Recurring services."), "the contract states the services clause");
  check(documentXml.includes("verify-co.com (Namecheap)"), "the contract lists each service with its provider");
  check(documentXml.includes("Included in the project fee"), "the contract says which first terms are included");

  const bare = { ...contract, proposal: { ...contract.proposal, content } } as typeof contract;
  const bareXml = readZipEntry(await buildContractDocx(bare), "word/document.xml");
  check(!bareXml.includes("Recurring services."), "a proposal with no services produces the contract unchanged");

  console.log(failures === 0 ? "\nAll service checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
