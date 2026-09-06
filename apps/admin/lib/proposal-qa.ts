import {
  investmentTotal,
  netTotal,
  paymentPercentTotal,
  validateProposalContent,
  type CompanyDetails,
  type ProposalContent,
  type ValidationIssue,
} from "./proposal-schema";

// QA gate for the proposal generator. The palette is fixed for every client,
// so contrast is checkable without rendering anything — this runs on every
// generation, before a single slide is built.

interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
  /** WCAG "large text": >=18pt regular or >=14pt bold. Everything else needs 4.5:1. */
  large: boolean;
}

const PAPER = "FAFAFA";
const DARK = "121212";

/**
 * Every (foreground, background) combination the generator paints. The two
 * brand entries are resolved from company settings, so changing the brand
 * color re-runs the check against the new value rather than against a
 * hardcoded one.
 */
function contrastPairs(company: CompanyDetails): ContrastPair[] {
  return [
    { name: "ink on paper (headings)", fg: "0F0F0F", bg: PAPER, large: false },
    { name: "inkTitle on paper (problem titles)", fg: "0D0D11", bg: PAPER, large: false },
    { name: "body on paper (descriptions)", fg: "666666", bg: PAPER, large: false },
    { name: "bodyWarm on paper (problem descriptions)", fg: "767373", bg: PAPER, large: false },
    { name: "label on paper (eyebrows/mono captions)", fg: "525252", bg: PAPER, large: false },
    { name: "muted on paper (quote, bar + week labels)", fg: "737373", bg: PAPER, large: false },
    { name: "brand accent word (18pt italic)", fg: company.brandColor, bg: PAPER, large: true },
    { name: "brand score value (10.5pt bold)", fg: company.brandColor, bg: PAPER, large: false },
    { name: "brand total amount (15.25pt bold)", fg: company.brandColor, bg: PAPER, large: true },
    // Payment-split labels are paper-on-fill, not --foreground-on-fill:
    // against the 737373 segment, FAFAFA clears AA (4.54:1) where F0F0F0
    // would not (4.16:1).
    { name: "paper % label on split segment 1 (muted fill)", fg: PAPER, bg: "737373", large: false },
    { name: "paper % label on split segment 2 (label fill)", fg: PAPER, bg: "525252", large: false },
    { name: "paper % label on split segment 3 (ink fill)", fg: PAPER, bg: "0F0F0F", large: false },
    { name: "coverFg on darkBg (cover/closing headings)", fg: "F0F0F0", bg: DARK, large: false },
    { name: "mutedOnDark on darkBg (secondary text)", fg: "949494", bg: DARK, large: false },
    { name: "brand accent word on dark (22pt italic)", fg: company.brandColorDark, bg: DARK, large: true },
  ];
}

// Decorative-only pairs, carried verbatim from the approved reference deck.
// These are not readable content: losing them costs a viewer nothing, and
// changing them would stop the output matching the signed-off design. They
// are listed (not silently omitted) so the ratio stays visible and any new
// low-contrast pair still has to be an explicit decision.
const DECORATIVE_EXCEPTIONS: ContrastPair[] = [
  { name: "numeralWarm index on paper (decorative)", fg: "A09880", bg: PAPER, large: false },
  { name: "hairline ghost numeral on paper (decorative)", fg: "E8E8E8", bg: PAPER, large: true },
];

function relativeLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [lr, lg, lb] = [r, g, b].map(lin);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface ContrastResult extends ContrastPair {
  ratio: number;
  threshold: number;
  pass: boolean;
  decorative: boolean;
}

export function checkProposalContrast(company: CompanyDetails): ContrastResult[] {
  const evaluate = (pair: ContrastPair, decorative: boolean): ContrastResult => {
    const threshold = pair.large ? 3.0 : 4.5;
    const ratio = contrastRatio(pair.fg, pair.bg);
    return { ...pair, ratio, threshold, pass: ratio >= threshold, decorative };
  };
  return [
    ...contrastPairs(company).map((p) => evaluate(p, false)),
    ...DECORATIVE_EXCEPTIONS.map((p) => evaluate(p, true)),
  ];
}

export class ProposalQaError extends Error {
  constructor(
    message: string,
    public issues: ValidationIssue[],
  ) {
    super(message);
    this.name = "ProposalQaError";
  }
}

/** Fails generation if any content-bearing color pair drops below WCAG AA. */
export function runProposalContrastGate(company: CompanyDetails): void {
  const failures = checkProposalContrast(company).filter((r) => !r.pass && !r.decorative);
  if (failures.length > 0) {
    throw new ProposalQaError(
      "Proposal colors fail WCAG AA contrast",
      failures.map((f) => ({
        path: "companySettings.brandColor",
        message: `${f.name}: ${f.ratio.toFixed(2)}:1, needs ${f.threshold}:1`,
      })),
    );
  }
}

/**
 * Server-side content gate. Deliberately re-runs everything the Admin form
 * checks: client-side validation is a convenience, never the guarantee.
 */
export function runProposalContentGate(value: unknown): ProposalContent {
  const result = validateProposalContent(value);
  if (!result.ok || !result.content) {
    throw new ProposalQaError("Proposal content failed validation", result.issues);
  }

  const content = result.content;
  const issues: ValidationIssue[] = [];

  // Belt and braces on the two numeric invariants that silently produce a
  // wrong document rather than a broken one.
  const percentTotal = paymentPercentTotal(content.paymentSchedule);
  if (Math.abs(percentTotal - 100) > 0.001) {
    issues.push({
      path: "paymentSchedule",
      message: `Payment percentages must total 100% (got ${percentTotal})`,
    });
  }
  if (investmentTotal(content.investmentItems) <= 0) {
    issues.push({
      path: "investmentItems",
      message: "Investment total must be greater than zero",
    });
  }
  // A discount can only ever reduce, never zero out or invert, the fee.
  if (netTotal(content.investmentItems, content.discount) <= 0) {
    issues.push({
      path: "discount",
      message: "The discount leaves nothing to invoice",
    });
  }

  if (issues.length > 0) {
    throw new ProposalQaError("Proposal content failed validation", issues);
  }
  return content;
}
