import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Client, Contract, Proposal } from "@repo/database";
import {
  CONTACT,
  SCOPE_INCLUDED,
  SCOPE_NOT_INCLUDED,
  getSolutionModules,
  projectTypeLabel,
} from "./proposal-content";
import {
  discountAmount,
  investmentTotal,
  proposalContentSchema,
} from "./proposal-schema";
import { applyVat, COMMERCIAL_TERMS, type ServiceId } from "@repo/pricing-schema";

// ---- Locked layout (ported from ~/.claude/skills/altruvex-contract Step 5) ----
const FONT_BODY = "Trebuchet MS";
const FONT_MONO = "Courier New";
const SIZE_BODY = 21; // 10.5pt, in half-points
const SIZE_H1 = 32; // 16pt
const SIZE_H2 = 24; // 12pt
const SIZE_SMALL = 18; // 9pt
const MARGIN = 1440; // 1" in twips


type ContractWithRelations = Contract & {
  client: Client;
  proposal: Proposal;
};

function draftFooterText(): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `DRAFT — FOR LEGAL REVIEW · Altruvex · ${dateStr}`;
}

function title(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({ text, bold: true, font: FONT_BODY, size: SIZE_H1 }),
    ],
  });
}

function subtitle(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({ text, font: FONT_BODY, size: SIZE_BODY, color: "666666" }),
    ],
  });
}

function draftBanner(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 360 },
    children: [
      new TextRun({
        text: "DRAFT — FOR LEGAL REVIEW. Governed by Egyptian law. Review by qualified Egyptian counsel is required before first use.",
        bold: true,
        italics: true,
        font: FONT_BODY,
        size: SIZE_SMALL,
        color: "B45309",
      }),
    ],
  });
}

function clauseHeading(number: number, text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [
      new TextRun({ text: `${number}. `, font: FONT_MONO, bold: true, size: SIZE_H2 }),
      new TextRun({ text: text.toUpperCase(), bold: true, font: FONT_BODY, size: SIZE_H2 }),
    ],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: FONT_BODY, size: SIZE_BODY })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({ text: `—  ${text}`, font: FONT_BODY, size: SIZE_BODY })],
  });
}

function cell(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): TableCell {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "E8E8E8" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "E8E8E8" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "E8E8E8" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "E8E8E8" },
    },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            font: opts.bold ? FONT_MONO : FONT_BODY,
            size: SIZE_BODY,
          }),
        ],
      }),
    ],
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Contract prose spells a count and repeats it in digits ("Three (3) rounds").
 * The wording is legal text already present in signed agreements, so the
 * number is sourced from the schema while the phrasing is preserved exactly.
 */
function spellSmallNumber(n: number): string {
  const words = [
    "Zero", "One", "Two", "Three", "Four", "Five",
    "Six", "Seven", "Eight", "Nine", "Ten",
  ];
  return words[n] ?? String(n);
}

function paymentTable(proposal: Proposal): Table {
  const split = proposal.paymentSplit as unknown as {
    first: number;
    second: number;
    final: number;
  };
  const rows = [
    ["First Payment", "Upon signing (commencement deposit)", `${split.first}%`, formatCurrency((proposal.totalPrice * split.first) / 100, proposal.currency)],
    ["Second Payment", "Upon design approval / development midpoint", `${split.second}%`, formatCurrency((proposal.totalPrice * split.second) / 100, proposal.currency)],
    ["Final Payment", "Prior to launch (staging → live domain)", `${split.final}%`, formatCurrency((proposal.totalPrice * split.final) / 100, proposal.currency)],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell("MILESTONE", { bold: true }),
          cell("TRIGGER", { bold: true }),
          cell("%", { bold: true, align: AlignmentType.RIGHT }),
          cell("AMOUNT", { bold: true, align: AlignmentType.RIGHT }),
        ],
      }),
      ...rows.map(
        ([m, t, pct, amt]) =>
          new TableRow({
            children: [
              cell(m),
              cell(t),
              cell(pct, { align: AlignmentType.RIGHT }),
              cell(amt, { align: AlignmentType.RIGHT }),
            ],
          }),
      ),
    ],
  });
}

export async function buildContractDocx(
  contract: ContractWithRelations,
): Promise<Buffer> {
  const { client, proposal } = contract;
  const clientName = client.company || client.name || "Client";
  const signatoryName = client.name || "Authorized Signatory";
  // VAT is charged on what is actually invoiced, so it follows the net figure
  // in `totalPrice` — never the pre-discount list price.
  const { vat: vatAmount, gross: grandTotal } = applyVat(proposal.totalPrice);

  // A discount has to be stated in the agreement, not just in the deck: the
  // client signs the reduced fee, and the reduction is what makes the number
  // in §3 differ from the one on the proposal's line items.
  const parsedContent = proposalContentSchema.safeParse(proposal.content);
  const reduction = parsedContent.success
    ? discountAmount(parsedContent.data.investmentItems, parsedContent.data.discount)
    : 0;
  const listPrice = parsedContent.success
    ? investmentTotal(parsedContent.data.investmentItems)
    : proposal.totalPrice;
  const discountLabel = parsedContent.success
    ? parsedContent.data.discount.label.trim() || "discount"
    : "discount";
  const modules = getSolutionModules(proposal.projectType as ServiceId);
  const effectiveDate = new Date(contract.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const children: (Paragraph | Table)[] = [
    title("CUSTOM PROJECT AGREEMENT"),
    subtitle(`Altruvex  ×  ${clientName}`),
    draftBanner(),

    clauseHeading(1, "Parties & Recitals"),
    body(
      `This Agreement is entered into on ${effectiveDate} between Altruvex ("Altruvex", ${CONTACT.email}, ${CONTACT.phone}) and ${clientName} ("Client"), referencing the proposal accepted by the Client for a ${projectTypeLabel(proposal.projectType as ServiceId)} engagement.`,
    ),

    clauseHeading(2, "Scope of Work"),
    body(
      "The following modules and deliverables are included in this engagement, as detailed in the accepted proposal:",
    ),
    ...modules.map((m) => bullet(`${m.title} — ${m.description}`)),
    body("Included in this engagement:"),
    ...SCOPE_INCLUDED.map((item) => bullet(item)),
    body("Not included (quoted separately if required):"),
    ...SCOPE_NOT_INCLUDED.map((item) => bullet(item)),

    clauseHeading(3, "Price & Payment"),
    ...(reduction > 0
      ? [
          body(
            `List price: ${formatCurrency(listPrice, proposal.currency)} (excl. VAT). A ${discountLabel} of ${formatCurrency(reduction, proposal.currency)} has been applied to this engagement. The discount is specific to this agreement and does not carry to any subsequent scope, change order, or renewal.`,
          ),
        ]
      : []),
    body(
      `Total project fee: ${formatCurrency(proposal.totalPrice, proposal.currency)} (excl. VAT)${reduction > 0 ? ", after the discount above" : ""}. VAT at ${Math.round(COMMERCIAL_TERMS.vatRate * 100)}%: ${formatCurrency(vatAmount, proposal.currency)}. Total incl. VAT: ${formatCurrency(grandTotal, proposal.currency)}.`,
    ),
    paymentTable(proposal),
    body(
      "No work begins before the commencement deposit clears — no exceptions. The deposit is non-refundable once work has begun. Invoices are due within 7 days of issue; late payments accrue interest at 1.5% per month. Work pauses on outstanding invoices, and paused time extends the delivery timeline day-for-day. Third-party fees (payment gateways, hosting beyond the included Year 1 base, SMS/email credits) are billed separately when used.",
    ),

    clauseHeading(4, "Staging & Launch Control"),
    body(
      "The Client reviews the completed build on Altruvex staging infrastructure. The system is deployed to the Client's production domain only after the final payment clears. Domain, SSL, deployment, and base hosting for Year 1 are included for standard website scopes.",
    ),

    clauseHeading(5, "Client Obligations"),
    body(
      "The Client provides all content, images, brand assets, and access credentials required for the project, and timely feedback at each review point. The delivery timeline begins at deposit clearance plus confirmed brief, and extends day-for-day for delays caused by the Client.",
    ),

    clauseHeading(6, "Revisions & Change Orders"),
    body(
      `${spellSmallNumber(COMMERCIAL_TERMS.includedRevisionRounds)} (${COMMERCIAL_TERMS.includedRevisionRounds}) rounds of revisions are included. Additional revision work is billed at ${formatCurrency(COMMERCIAL_TERMS.revisionHourlyRate, "EGP")}/hr (or ${formatCurrency(COMMERCIAL_TERMS.revisionHourlyRateUsd, "USD")}/hr USD). Any change to the agreed scope requires a signed Change Order before work on it begins. Scope reductions are re-scoped as a separate deliverable at a corresponding price adjustment — never a discount on the original scope.`,
    ),

    clauseHeading(7, "Timeline"),
    body(
      `Estimated delivery: ${proposal.timelineWeeks} weeks from kickoff (deposit clearance + confirmed brief), subject to the delay mechanics in Clauses 3 and 5.`,
    ),

    clauseHeading(8, "Intellectual Property & Ownership"),
    body(
      "Upon final payment, the Client owns 100% of the custom source code, data, and custom logic/architecture built for this project. Altruvex retains ownership of its internal methodology, tools, and reusable components not built exclusively for this project.",
    ),
    body(
      "Handover on final payment includes: the Git repository under Client control, deployment documentation, environment variable / secrets management, database schema and migration history, and an architecture decision log.",
    ),
    body(
      "Altruvex may reference this project in its portfolio and case studies, unless the Client opts out in writing.",
    ),

    clauseHeading(9, "Warranty & Support"),
    body(
      `The delivered system is built to industry best practices, tested before handoff, and covered by ${COMMERCIAL_TERMS.postLaunchWarrantyDays} days of post-launch support for critical fixes at no additional charge. Not covered: traffic or conversion outcomes, third-party service uptime, unsupported post-delivery modifications, or issues arising from Client security negligence. Ongoing maintenance beyond the ${COMMERCIAL_TERMS.postLaunchWarrantyDays}-day window is available under a separate retainer agreement.`,
    ),

    clauseHeading(10, "Confidentiality"),
    body(
      "Both parties treat the other's business processes, customer data, and financial information as confidential, to be used only for the purposes of this engagement, and protected using industry-standard measures. This excludes information the Client mishandles or discloses independently.",
    ),

    clauseHeading(11, "Limitation of Liability"),
    body(
      "Altruvex's total liability under this Agreement is capped at the fees paid by the Client in the 12 months preceding the claim. Neither party is liable for indirect or consequential damages.",
    ),

    clauseHeading(12, "Termination"),
    body(
      "Either party may terminate on material breach left uncured 14 days after written notice, or on the other party's insolvency. On Client-initiated termination, completed milestones and work-in-progress to date become payable; the deposit is non-refundable; delivered work transfers under Clause 8 only for the portions actually paid for.",
    ),

    clauseHeading(13, "Dispute Resolution"),
    body(
      `Disputes are first raised in writing to ${CONTACT.email}, followed by 14 days of good-faith negotiation, then mediation, then litigation. For Egyptian clients, this Agreement is governed by Egyptian law with venue in Cairo.`,
    ),

    clauseHeading(14, "General"),
    body(
      "This Agreement is the entire agreement between the parties on this engagement and supersedes prior discussions. It may only be amended in writing signed by both parties. If any provision is found unenforceable, the remainder stays in effect. Neither party may assign this Agreement without the other's consent. Neither party is liable for delays caused by events beyond its reasonable control.",
    ),

    new Paragraph({ spacing: { before: 480 }, children: [] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 240 },
      children: [new TextRun({ text: "SIGNATURES", bold: true, font: FONT_BODY, size: SIZE_H2 })],
    }),
    body(`For Altruvex:                                                    Date:`),
    body(`Name: _____________________________`),
    body(""),
    body(`For ${clientName}:                                                    Date:`),
    body(`Name: ${signatoryName}`),
    body(`Title: _____________________________`),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: draftFooterText(),
                    font: FONT_MONO,
                    size: SIZE_SMALL,
                    color: "999999",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
