import {
  investmentTotal,
  netTotal,
  paymentPercentTotal,
  validateProposalContent,
  type CompanyDetails,
  type ProposalContent,
  type ValidationIssue,
} from "./proposal-schema";
import { DECK_COLORS } from "./document-colors";

interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
  large: boolean;
}

const C = DECK_COLORS;
const PAPER = C.paper;
const DARK = C.darkBg;

function contrastPairs(company: CompanyDetails): ContrastPair[] {
  return [
    { name: "ink on paper (headings)", fg: C.ink, bg: PAPER, large: false },
    { name: "inkTitle on paper (problem titles)", fg: C.inkTitle, bg: PAPER, large: false },
    { name: "body on paper (descriptions)", fg: C.body, bg: PAPER, large: false },
    { name: "bodyWarm on paper (problem descriptions)", fg: C.bodyWarm, bg: PAPER, large: false },
    { name: "label on paper (eyebrows/mono captions)", fg: C.label, bg: PAPER, large: false },
    { name: "muted on paper (quote, bar + week labels)", fg: C.muted, bg: PAPER, large: false },
    { name: "brand accent word (18pt italic)", fg: company.brandColor, bg: PAPER, large: true },
    { name: "brand score value (10.5pt bold)", fg: company.brandColor, bg: PAPER, large: false },
    { name: "brand total amount (15.25pt bold)", fg: company.brandColor, bg: PAPER, large: true },
    { name: "paper % label on split segment 1 (muted fill)", fg: PAPER, bg: C.muted, large: false },
    { name: "paper % label on split segment 2 (label fill)", fg: PAPER, bg: C.label, large: false },
    { name: "paper % label on split segment 3 (ink fill)", fg: PAPER, bg: C.ink, large: false },
    { name: "coverFg on darkBg (cover/closing headings)", fg: C.coverFg, bg: DARK, large: false },
    { name: "mutedOnDark on darkBg (secondary text)", fg: C.mutedOnDark, bg: DARK, large: false },
    { name: "brand accent word on dark (22pt italic)", fg: company.brandColorDark, bg: DARK, large: true },
  ];
}

const DECORATIVE_EXCEPTIONS: ContrastPair[] = [
  { name: "numeralWarm index on paper (decorative)", fg: C.numeralWarm, bg: PAPER, large: false },
  { name: "hairline ghost numeral on paper (decorative)", fg: C.hairline, bg: PAPER, large: true },
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

export function runProposalContentGate(value: unknown): ProposalContent {
  const result = validateProposalContent(value);
  if (!result.ok || !result.content) {
    throw new ProposalQaError("Proposal content failed validation", result.issues);
  }

  const content = result.content;
  const issues: ValidationIssue[] = [];

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
