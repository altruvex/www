import PptxGenJS from "pptxgenjs";
import { runProposalContrastGate } from "./proposal-qa";
import {
  discountAmount,
  fillTemplate,
  investmentTotal,
  netTotal,
  paymentAmount,
  validUntilDate,
  type CompanyDetails,
  type ProposalContent,
} from "./proposal-schema";

// ---- Locked design system ----
// Every geometric value in this file is measured from the approved reference
// deck. It is fixed for every client: only the CONTENT varies, and all of it
// arrives in the ProposalContent argument. There is no client-specific
// literal anywhere below — if you find one, it is a bug, not a default.
//
// Colors are the deck's own, not an approximation: where the reference uses a
// warm neutral (E3DED7, A09880) rather than the cool --n-* ramp, that IS the
// design — do not "correct" it back to the cool ramp.
const TOKENS = {
  // light surface (slides 2-6)
  paper: "FAFAFA",
  ink: "0F0F0F",
  inkTitle: "0D0D11", // problem-card titles sit a shade cooler than --foreground
  body: "666666",
  bodyWarm: "767373", // problem-card descriptions
  label: "525252", // eyebrows, footers, mono labels
  muted: "737373", // captions, quote, bar labels, split segment 1
  hairline: "E8E8E8",
  ruleWarm: "E3DED7", // problem-card left rule
  numeralWarm: "A09880", // problem-card index numerals

  // dark surface (slides 1 + 7)
  darkBg: "121212",
  coverFg: "F0F0F0",
  mutedOnDark: "949494",
  ghostDark: "242424", // ghost numeral, dot grid, crop marks, CTA border
};

const FONT = {
  display: "Georgia",
  heading: "Trebuchet MS",
  mono: "Courier New",
};

const ML = 0.65;
const MT = 0.65;
// The reference deck's slide box is 595.5 x 841.625pt. Declaring 8.27 x 11.69
// instead lands one EMU tick away and shifts the rendered page edge by a pixel,
// so the exact figures are kept here.
const PAGE_W = 7562850 / 914400;
const PAGE_H = 10688638 / 914400;
// Content measure is its own constant, not PAGE_W - margins: the reference
// lays every full-width element out on a 6.97in column.
const TW = 6.97;
const CONTENT_R = ML + TW; // right edge of the content column
const FRAME_B = 11.14; // baseline the footer and bottom crop marks sit on

// Reference text boxes carry zero inset and center-anchored text; without
// these every box would sit ~0.1in inward of its measured position.
const BOX = { margin: 0, valign: "middle" } as const;

/** EMU is the unit the .pptx itself stores; pptxgenjs takes inches. */
const EMU_PER_INCH = 914400;
const inches = (emu: number) => emu / EMU_PER_INCH;

// Slide 2's problem list, pinned to the approved deck's own EMU values.
// That file was hand-tuned in PowerPoint, so the first three items do not
// share one rhythm: each title and description carries its own sub-0.02in
// offset and the first item's rule is a hair narrower. Items past the third
// continue on the last item's offsets.
const PROBLEM_FIRST_Y = 2194560; // 2.40in
const PROBLEM_STEP = 1097280; // 1.20in
const PROBLEM_RULE_H = 792000; // 0.8661in
const PROBLEM_ITEMS = [
  { ruleW: 21600, titleY: -9144, descY: 265176 },
  { ruleW: 22860, titleY: 3165, descY: 282057 },
  { ruleW: 22860, titleY: 6007, descY: 254977 },
] as const;

function formatCurrency(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(amount)
    // Intl separates the code from the number with U+00A0; the deck uses a
    // plain space. Courier New renders them at the same width, but the
    // non-breaking space would show up as a mismatch in any text diff.
    .replace(/\u00A0/g, " ");
  return formatted;
}

/**
 * Total weeks the timeline actually covers. Read off the phases so it can
 * never contradict them: sum the leading number in each duration label when
 * every label carries one, otherwise fall back to counting the phases.
 * There is deliberately no separately entered total to drift out of sync.
 */
function totalTimelineWeeks(phases: { durationLabel: string }[]): number {
  const parsed = phases.map((phase) => {
    const match = /^\s*(\d+(?:\.\d+)?)/.exec(phase.durationLabel);
    return match ? Number(match[1]) : null;
  });
  if (parsed.every((value) => value !== null)) {
    const sum = (parsed as number[]).reduce((total, value) => total + value, 0);
    return Number.isInteger(sum) ? sum : Math.round(sum);
  }
  return phases.length;
}

function hairline(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  x: number,
  y: number,
  w: number,
  color: string,
  h = 0.01,
) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color } });
}

/** One corner tick: a horizontal and a vertical arm meeting at (x, y). */
function cornerMark(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  x: number,
  y: number,
  arm: number,
  offset: number,
  width: number,
) {
  slide.addShape(pptx.ShapeType.line, {
    x: x - offset,
    y,
    w: arm,
    h: 0,
    line: { color: TOKENS.ghostDark, width },
  });
  slide.addShape(pptx.ShapeType.line, {
    x,
    y: y - offset,
    w: 0,
    h: arm,
    line: { color: TOKENS.ghostDark, width },
  });
}

function dotGrid(slide: PptxGenJS.Slide, pptx: PptxGenJS, x: number, y: number) {
  const cols = 6;
  const rows = 6;
  const gap = 0.16;
  const dot = 0.05;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: x + col * gap,
        y: y + row * gap,
        w: dot,
        h: dot,
        fill: { color: TOKENS.ghostDark },
      });
    }
  }
}

function footer(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  companyName: string,
  pageNumber: number,
  dark = false,
) {
  const color = dark ? TOKENS.mutedOnDark : TOKENS.label;
  hairline(slide, pptx, ML, 11.12, TW, dark ? TOKENS.ghostDark : TOKENS.hairline);
  slide.addText(companyName.toUpperCase(), {
    ...BOX,
    x: ML,
    y: FRAME_B,
    w: 2.0,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color,
  });
  slide.addText(String(pageNumber).padStart(2, "0"), {
    ...BOX,
    x: 6.62,
    y: FRAME_B,
    w: 1.0,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color,
    align: "right",
  });
}

function eyebrow(slide: PptxGenJS.Slide, text: string, dark = false) {
  slide.addText(text.toUpperCase(), {
    ...BOX,
    x: ML,
    y: MT,
    w: TW,
    h: dark ? 0.25 : 0.3,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: dark ? TOKENS.mutedOnDark : TOKENS.label,
    charSpacing: 3,
  });
}

/** Section heading: bold sans lead-in + the one Georgia-italic accent word. */
function sectionHeading(
  slide: PptxGenJS.Slide,
  lead: string,
  accent: string,
  brand: string,
) {
  slide.addText(
    [
      { text: lead, options: { fontFace: FONT.heading, bold: true, fontSize: 18, color: TOKENS.ink } },
      { text: accent, options: { fontFace: FONT.display, italic: true, fontSize: 18, color: brand } },
    ],
    { ...BOX, x: ML, y: 1.0, w: TW, h: 0.5 },
  );
}

interface Ctx {
  content: ProposalContent;
  company: CompanyDetails;
}

// ---- Slide 1 — Cover ----
function buildCoverSlide(pptx: PptxGenJS, { content, company }: Ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.darkBg };

  // Draw order matters: the header's text box overlaps the dot grid, and the
  // reference lays the dots down first.
  dotGrid(slide, pptx, 5.6, 0.5);

  // Page crop marks at the four margin corners.
  const arm = 0.16;
  for (const [x, y] of [
    [ML, MT],
    [CONTENT_R, MT],
    [ML, FRAME_B],
    [CONTENT_R, FRAME_B],
  ] as const) {
    cornerMark(slide, pptx, x, y, arm, arm / 2, 0.75);
  }

  const dateStr = new Date(content.meta.proposalDate)
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();

  slide.addText(fillTemplate(content.labels.cover.eyebrow, { date: dateStr }), {
    ...BOX,
    x: ML,
    y: MT,
    w: TW,
    h: 0.3,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.mutedOnDark,
    charSpacing: 3,
  });

  // Ghost page number, bled off the left edge. Its bleed is a measured
  // value, not a round number — kept in EMU so it lands exactly.
  slide.addText("01", {
    ...BOX,
    x: inches(-377334),
    y: inches(3291841),
    w: 5.0,
    h: 3.0,
    fontFace: FONT.heading,
    bold: true,
    fontSize: 180,
    color: TOKENS.ghostDark,
  });

  slide.addText(
    [
      { text: content.labels.cover.titleLine1, options: { fontFace: FONT.display, fontSize: 60, color: TOKENS.coverFg, breakLine: true } },
      { text: content.labels.cover.titleLine2, options: { fontFace: FONT.display, fontSize: 60, italic: true, color: TOKENS.mutedOnDark } },
    ],
    { ...BOX, x: ML, y: 4.3, w: TW, h: 2.4, lineSpacingMultiple: 0.95 },
  );

  // Client block, bracketed top and bottom.
  const bracket = 0.18;
  for (const y of [7.3, 9.0]) {
    cornerMark(slide, pptx, ML, y, bracket, 0, 1);
    cornerMark(slide, pptx, CONTENT_R, y, bracket, 0, 1);
  }

  const blockX = 0.9;
  slide.addText(content.labels.cover.preparedFor, {
    ...BOX,
    x: blockX,
    y: 7.45,
    w: 4.0,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.mutedOnDark,
    charSpacing: 3,
  });
  slide.addText(content.meta.clientCompany, {
    ...BOX,
    x: blockX,
    y: 7.75,
    w: 6.47,
    h: 0.5,
    fontFace: FONT.heading,
    bold: true,
    fontSize: 26,
    color: TOKENS.coverFg,
  });
  slide.addText(content.meta.clientName, {
    ...BOX,
    x: blockX,
    y: 8.25,
    w: 6.47,
    h: 0.35,
    fontFace: FONT.heading,
    fontSize: 14,
    color: TOKENS.mutedOnDark,
  });
  slide.addText(content.meta.projectLabel.toUpperCase(), {
    ...BOX,
    x: blockX,
    y: 8.65,
    w: 5.0,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.mutedOnDark,
    charSpacing: 2,
  });

  slide.addText(`${company.phone}   ·   ${company.email}   ·   ${company.website}`, {
    ...BOX,
    x: ML,
    y: 11.09,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.mutedOnDark,
    align: "center",
  });
}

// ---- Slide 2 — Project Understanding ----
function buildProblemSlide(pptx: PptxGenJS, { content, company }: Ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  const section = content.sections.problems;
  eyebrow(slide, section.eyebrow);
  sectionHeading(slide, section.lead, section.accent, company.brandColor);
  slide.addText(section.intro, {
      ...BOX,
      x: ML,
      y: 1.6,
      w: TW,
      h: 0.55,
      fontFace: FONT.heading,
      fontSize: 13,
      color: TOKENS.body,
      lineSpacingMultiple: 1.25,
  });

  content.problems.forEach((problem, i) => {
    const item = PROBLEM_ITEMS[Math.min(i, PROBLEM_ITEMS.length - 1)];
    const yEmu = PROBLEM_FIRST_Y + i * PROBLEM_STEP;
    const y = inches(yEmu);
    slide.addShape(pptx.ShapeType.rect, {
      x: ML,
      y,
      w: inches(item.ruleW),
      h: inches(PROBLEM_RULE_H),
      fill: { color: TOKENS.ruleWarm },
    });
    // Number and title share one line.
    slide.addText(String(i + 1).padStart(2, "0"), {
      ...BOX,
      x: 0.85,
      y,
      w: 0.6,
      h: 0.3,
      fontFace: FONT.mono,
      bold: true,
      fontSize: 11,
      color: TOKENS.numeralWarm,
    });
    slide.addText(problem.title, {
      ...BOX,
      x: 1.15,
      y: inches(yEmu + item.titleY),
      w: 6.67,
      h: 0.3,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 13,
      color: TOKENS.inkTitle,
    });
    slide.addText(problem.description, {
      ...BOX,
      x: 0.85,
      y: inches(yEmu + item.descY),
      w: 6.67,
      h: 0.45,
      fontFace: FONT.heading,
      fontSize: 11,
      color: TOKENS.bodyWarm,
      lineSpacingMultiple: 1.2,
    });
  });

  // Anchored to the page, not to the item list — the quote holds the same
  // baseline no matter how many problems the proposal carries.
  slide.addText(section.quote, {
      ...BOX,
      x: ML,
      y: 10.39,
      w: TW,
      h: 0.5,
      fontFace: FONT.mono,
      italic: true,
      fontSize: 12,
      color: TOKENS.muted,
  });

  footer(slide, pptx, content.labels.footerCompany, 2);
}

// ---- Slide 3 — Proposed Solution ----
function buildSolutionSlide(pptx: PptxGenJS, { content, company }: Ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  const section = content.sections.solution;
  eyebrow(slide, section.eyebrow);
  sectionHeading(slide, section.lead, section.accent, company.brandColor);

  const cardW = 3.36;
  const cardH = 1.7;
  const colGap = 0.25;
  const rowGap = 0.2;
  const gridY = 2.3;
  const pad = 0.2;
  const numeralW = 0.45;
  // The description stops short of the ghost numeral's column instead of
  // running under it — clearance derived from the numeral box, so longer
  // copy can never overlap it.
  const numeralX = 2.81;
  const descW = numeralX - pad - 0.2;

  content.solutionModules.forEach((module, i) => {
    const x = ML + (i % 2) * (cardW + colGap);
    const y = gridY + Math.floor(i / 2) * (cardH + rowGap);

    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { type: "none" },
      line: { color: TOKENS.hairline, width: 0.75 },
    });
    slide.addText(String(i + 1), {
      ...BOX,
      x: x + numeralX,
      y: y + 1.15,
      w: numeralW,
      h: 0.45,
      fontFace: FONT.mono,
      bold: true,
      fontSize: 32,
      color: TOKENS.hairline,
      align: "right",
    });
    slide.addText(module.title, {
      ...BOX,
      x: x + pad,
      y: y + 0.18,
      w: cardW - pad * 2,
      h: 0.35,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 14,
      color: TOKENS.ink,
    });
    slide.addText(module.description, {
      ...BOX,
      x: x + pad,
      y: y + 0.55,
      w: descW,
      h: 1.0,
      fontFace: FONT.heading,
      fontSize: 11.5,
      color: TOKENS.body,
      lineSpacingMultiple: 1.2,
    });
  });

  // The whole performance block follows the card grid, so a fifth or sixth
  // module pushes it down instead of being overlapped by it.
  const gridRows = Math.ceil(content.solutionModules.length / 2);
  const gridBottom = gridY + (gridRows - 1) * (cardH + rowGap) + cardH;
  const targetsLabelY = Math.max(6.0, gridBottom + 0.1);

  slide.addText(content.labels.performanceTargets, {
    ...BOX,
    x: ML,
    y: targetsLabelY,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 10.5,
    color: TOKENS.label,
    charSpacing: 2,
  });

  // Fixed column pitch while the row fits the content width, compressed to
  // fit once it doesn't — so three targets keep the reference's rhythm and
  // more than three still stay inside the margins.
  const targets = content.performanceTargets;
  const targetGutter = 0.1;
  const targetPitch = Math.min(2.3, TW / targets.length);
  targets.forEach((target, i) => {
    slide.addText(target.label, {
      ...BOX,
      x: ML + i * targetPitch,
      y: targetsLabelY + 0.3,
      w: targetPitch - targetGutter,
      h: 0.25,
      fontFace: FONT.mono,
      fontSize: 10.5,
      color: TOKENS.muted,
    });
  });

  const barsY = targetsLabelY + 0.75;
  const barStep = 0.58;
  const barH = 0.06;

  content.performanceScores.forEach((bar, i) => {
    const y = barsY + i * barStep;
    slide.addText(bar.label, {
      ...BOX,
      x: ML,
      y,
      w: 3.0,
      h: 0.25,
      fontFace: FONT.mono,
      fontSize: 10.5,
      color: TOKENS.muted,
    });
    slide.addText(String(bar.score), {
      ...BOX,
      x: 6.92,
      y: y - 0.03,
      w: 0.7,
      h: 0.3,
      fontFace: FONT.mono,
      bold: true,
      fontSize: 10.5,
      color: company.brandColor,
      align: "right",
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: ML,
      y: y + 0.28,
      w: TW,
      h: barH,
      fill: { color: TOKENS.hairline },
    });
    // Fill width is the score, never a constant.
    slide.addShape(pptx.ShapeType.rect, {
      x: ML,
      y: y + 0.28,
      w: (TW * bar.score) / 100,
      h: barH,
      fill: { color: TOKENS.ink },
    });
  });

  footer(slide, pptx, content.labels.footerCompany, 3);
}

// ---- Slide 4 — Timeline ----
function buildTimelineSlide(pptx: PptxGenJS, { content, company }: Ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  const section = content.sections.timeline;
  eyebrow(slide, section.eyebrow);
  sectionHeading(slide, section.lead, section.accent, company.brandColor);

  const phases = content.timelinePhases;
  const rowsY = 1.58;
  const rowStep = 0.78;
  const dotSize = 0.12;

  // Reaches the last dot exactly, whatever the phase count.
  slide.addShape(pptx.ShapeType.line, {
    x: ML + 0.12,
    y: rowsY + 0.12,
    w: 0,
    h: (phases.length - 1) * rowStep,
    line: { color: TOKENS.hairline, width: 1 },
  });

  phases.forEach((phase, i) => {
    const y = rowsY + i * rowStep;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.71,
      y: y + 0.06,
      w: dotSize,
      h: dotSize,
      fill: { color: i === 0 ? TOKENS.ink : TOKENS.paper },
      line: { color: TOKENS.muted, width: 1 },
    });
    slide.addText(String(i + 1).padStart(2, "0"), {
      ...BOX,
      x: 1.0,
      y,
      w: 0.5,
      h: 0.25,
      fontFace: FONT.mono,
      fontSize: 9.5,
      color: TOKENS.label,
    });
    slide.addText(phase.name, {
      ...BOX,
      x: 1.5,
      y: y - 0.03,
      w: 3.6,
      h: 0.35,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 14.5,
      color: TOKENS.ink,
    });
    slide.addText(phase.deliverable, {
      ...BOX,
      x: 1.5,
      y: y + 0.28,
      w: 3.6,
      h: 0.3,
      fontFace: FONT.heading,
      fontSize: 13.5,
      color: TOKENS.body,
    });
    slide.addText(phase.durationLabel, {
      ...BOX,
      x: 6.12,
      y: y + 0.07,
      w: 1.5,
      h: 0.3,
      fontFace: FONT.heading,
      fontSize: 13.5,
      color: TOKENS.muted,
      align: "right",
    });
  });

  // Same rule on the timeline: the chart follows the rows.
  const rowsBottom = rowsY + (phases.length - 1) * rowStep + 0.58;
  const loadLabelY = Math.max(6.63, rowsBottom + 0.57);

  slide.addText(content.labels.weeklyLoad, {
    ...BOX,
    x: ML,
    y: loadLabelY,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
    charSpacing: 2,
  });

  // One bar per phase, height from that phase's own load value.
  const chartW = 4.97;
  const chartBottom = loadLabelY + 1.0;
  const chartH = 0.9;
  const barGap = 0.1;
  const barW = (chartW - (phases.length - 1) * barGap) / phases.length;

  phases.forEach((phase, i) => {
    const h = (chartH * phase.weeklyLoad) / 100;
    const x = ML + i * (barW + barGap);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: chartBottom - h,
      w: barW,
      h,
      fill: { color: i === 0 ? company.brandColor : TOKENS.ink },
    });
    slide.addText(fillTemplate(content.labels.weeklyLoadTick, { n: i + 1 }), {
      ...BOX,
      x,
      y: loadLabelY + 1.05,
      w: barW,
      h: 0.2,
      fontFace: FONT.mono,
      fontSize: 9.5,
      color: TOKENS.muted,
      align: "center",
    });
  });

  slide.addText(
    fillTemplate(content.labels.timelineTotal, { weeks: totalTimelineWeeks(phases) }),
    {
      ...BOX,
      x: ML,
      y: 10.79,
      w: TW,
      h: 0.25,
      fontFace: FONT.mono,
      fontSize: 9.5,
      color: TOKENS.label,
    },
  );

  footer(slide, pptx, content.labels.footerCompany, 4);
}

// ---- Slide 5 — Investment ----
function buildInvestmentSlide(pptx: PptxGenJS, { content, company }: Ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  const { currency } = content.meta;
  const section = content.sections.investment;
  eyebrow(slide, section.eyebrow);
  sectionHeading(slide, section.lead, section.accent, company.brandColor);

  const amountX = 5.32;
  const amountW = 2.3;

  slide.addText(content.labels.investmentItem, {
    ...BOX,
    x: ML,
    y: 1.75,
    w: 4.0,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
  });
  slide.addText(content.labels.investmentAmount, {
    ...BOX,
    x: amountX,
    y: 1.75,
    w: amountW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
    align: "right",
  });
  hairline(slide, pptx, ML, 2.05, TW, TOKENS.hairline);

  const rowStep = 0.55;
  const firstRowY = 2.2;
  content.investmentItems.forEach((item, i) => {
    const y = firstRowY + i * rowStep;
    slide.addText(item.item, {
      ...BOX,
      x: ML,
      y,
      w: 4.6,
      h: 0.35,
      fontFace: FONT.heading,
      fontSize: 14.5,
      color: TOKENS.ink,
    });
    slide.addText(formatCurrency(item.amount, currency), {
      ...BOX,
      x: amountX,
      y,
      w: amountW,
      h: 0.35,
      fontFace: FONT.mono,
      fontSize: 14.5,
      color: TOKENS.body,
      align: "right",
    });
    hairline(slide, pptx, ML, y + 0.4, TW, TOKENS.hairline, 0.008);
  });

  // Everything below the table hangs off the total, so the block keeps its
  // spacing whatever the item count.
  const subtotal = investmentTotal(content.investmentItems);
  const reduction = discountAmount(content.investmentItems, content.discount);
  const total = netTotal(content.investmentItems, content.discount);

  // A discount is shown as its own two lines above the total — the list price
  // the client was quoted, then what came off it. Folding it silently into the
  // total would throw away the only part of a discount that persuades anyone.
  let totalY = firstRowY + content.investmentItems.length * rowStep + 0.1;
  if (reduction > 0) {
    const subtotalY = totalY;
    slide.addText("SUBTOTAL", {
      ...BOX,
      x: ML,
      y: subtotalY,
      w: 4.0,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 9.5,
      color: TOKENS.label,
      charSpacing: 2,
    });
    slide.addText(formatCurrency(subtotal, currency), {
      ...BOX,
      x: amountX,
      y: subtotalY,
      w: amountW,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 12,
      color: TOKENS.body,
      align: "right",
    });

    const discountY = subtotalY + 0.36;
    slide.addText(content.discount.label.trim().toUpperCase() || "DISCOUNT", {
      ...BOX,
      x: ML,
      y: discountY,
      w: 4.0,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 9.5,
      color: TOKENS.label,
      charSpacing: 2,
    });
    // The minus sign is the whole point of the row; an unsigned figure here
    // reads as another charge.
    slide.addText(`− ${formatCurrency(reduction, currency)}`, {
      ...BOX,
      x: amountX,
      y: discountY,
      w: amountW,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 12,
      color: TOKENS.body,
      align: "right",
    });

    hairline(slide, pptx, ML, discountY + 0.36, TW, TOKENS.hairline);
    totalY = discountY + 0.5;
  }

  slide.addText(content.labels.investmentTotal, {
    ...BOX,
    x: ML,
    y: totalY,
    w: 4.0,
    h: 0.35,
    fontFace: FONT.heading,
    bold: true,
    italic: true,
    fontSize: 15,
    color: TOKENS.ink,
  });
  slide.addText(formatCurrency(total, currency), {
    ...BOX,
    x: 4.62,
    y: totalY - 0.02,
    w: 3.0,
    h: 0.4,
    fontFace: FONT.mono,
    bold: true,
    fontSize: 15.25,
    color: company.brandColor,
    align: "right",
  });

  slide.addText(content.labels.paymentSplit, {
    ...BOX,
    x: ML,
    y: totalY + 0.75,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
    charSpacing: 2,
  });

  const splitY = totalY + 1.05;
  const splitH = 0.4;
  const segmentColors = [TOKENS.muted, TOKENS.label, TOKENS.ink];
  let segX = ML;
  content.paymentSchedule.forEach((row, i) => {
    const w = (TW * row.percent) / 100;
    const color = segmentColors[i % segmentColors.length];
    slide.addShape(pptx.ShapeType.rect, { x: segX, y: splitY, w, h: splitH, fill: { color } });
    slide.addText(`${row.percent}%`, {
      ...BOX,
      x: segX,
      y: splitY,
      w,
      h: splitH,
      fontFace: FONT.mono,
      fontSize: 9.5,
      // paper, not --foreground: on the 737373 segment this is the pairing
      // that clears AA (4.54:1 vs 4.16:1 for F0F0F0).
      color: TOKENS.paper,
      align: "center",
    });
    segX += w;
  });

  const payFirstY = totalY + 1.65;
  const payStep = 0.38;
  content.paymentSchedule.forEach((row, i) => {
    const y = payFirstY + i * payStep;
    slide.addText(row.label, {
      ...BOX,
      x: ML,
      y,
      w: 1.9,
      h: 0.3,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 12,
      color: TOKENS.ink,
    });
    slide.addText(row.trigger, {
      ...BOX,
      x: 2.65,
      y,
      w: 3.1,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 11,
      color: TOKENS.body,
    });
    // Recomputed here every time — a stored amount would go stale the
    // moment an investment item changed.
    slide.addText(formatCurrency(paymentAmount(content, row.percent), currency), {
      ...BOX,
      x: 6.32,
      y,
      w: 1.3,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 12,
      color: TOKENS.ink,
      align: "right",
    });
  });

  const validUntil = validUntilDate(content.meta).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  // Clears the payment rows rather than sitting at a height that only
  // suits three of them.
  const payBottom = payFirstY + (content.paymentSchedule.length - 1) * payStep + 0.3;
  slide.addText(fillTemplate(content.labels.validUntil, { date: validUntil }), {
    ...BOX,
    x: ML,
    y: payBottom + 0.23,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
  });

  footer(slide, pptx, content.labels.footerCompany, 5);
}

// ---- Slide 6 — Scope & Terms ----
function buildScopeSlide(pptx: PptxGenJS, { content, company }: Ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  const section = content.sections.scope;
  eyebrow(slide, section.eyebrow);
  sectionHeading(slide, section.lead, section.accent, company.brandColor);

  const colW = 3.335;
  const colGap = 0.3;
  const rightX = ML + colW + colGap;
  const bullet = { characterCode: "2022", indent: 27 } as const;

  slide.addText(content.labels.scopeIncluded, {
    ...BOX,
    x: ML,
    y: 1.7,
    w: colW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
    charSpacing: 2,
  });
  slide.addText(content.labels.scopeNotIncluded, {
    ...BOX,
    x: rightX,
    y: 1.7,
    w: colW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
    charSpacing: 2,
  });

  const itemFirstY = 2.05;
  const itemStep = 0.32;
  const columns: [string[], number][] = [
    [content.scopeIncluded, ML],
    [content.scopeNotIncluded, rightX],
  ];
  for (const [items, x] of columns) {
    items.forEach((item, i) => {
      slide.addText(item, {
        ...BOX,
        x,
        y: itemFirstY + i * itemStep,
        w: colW,
        h: 0.3,
        fontFace: FONT.heading,
        fontSize: 11,
        color: TOKENS.body,
        bullet,
      });
    });
  }

  // Key terms clear the longer of the two scope columns rather than sitting
  // at a fixed height that a longer list would collide with.
  const longestScope = Math.max(
    content.scopeIncluded.length,
    content.scopeNotIncluded.length,
  );
  const termsLabelY = Math.max(4.55, itemFirstY + longestScope * itemStep + 0.28);

  slide.addText(content.labels.keyTerms, {
    ...BOX,
    x: ML,
    y: termsLabelY,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color: TOKENS.label,
    charSpacing: 2,
  });

  const termStep = 0.44;
  const termValueX = 2.25;
  content.keyTerms.forEach((term, i) => {
    const y = termsLabelY + 0.35 + i * termStep;
    slide.addText(term.label, {
      ...BOX,
      x: ML,
      y,
      w: 1.5,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 9.5,
      color: TOKENS.label,
    });
    slide.addText(term.value, {
      ...BOX,
      x: termValueX,
      y,
      w: CONTENT_R - termValueX,
      h: 0.35,
      fontFace: FONT.heading,
      fontSize: 11,
      color: TOKENS.body,
      lineSpacingMultiple: 1.1,
    });
  });

  footer(slide, pptx, content.labels.footerCompany, 6);
}

// ---- Slide 7 — Why Altruvex ----
function buildClosingSlide(pptx: PptxGenJS, { content, company }: Ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.darkBg };

  eyebrow(slide, content.sections.closing.eyebrow, true);
  slide.addText(content.sections.closing.heading, {
    ...BOX,
    x: ML,
    y: 0.95,
    w: TW,
    h: 0.4,
    fontFace: FONT.heading,
    bold: true,
    fontSize: 18,
    color: TOKENS.coverFg,
  });

  slide.addText(
    [
      { text: content.whyUs.headlineLine1, options: { fontFace: FONT.display, fontSize: 22, color: TOKENS.coverFg, breakLine: true } },
      { text: content.whyUs.headlineLine2, options: { fontFace: FONT.display, italic: true, fontSize: 22, color: company.brandColorDark } },
    ],
    { ...BOX, x: ML, y: 1.55, w: TW, h: 1.3, lineSpacingMultiple: 1.05 },
  );

  // Full measure, not a narrow left column.
  slide.addText(content.whyUs.paragraph, {
    ...BOX,
    x: ML,
    y: 3.1,
    w: 7.2614,
    h: 1.1,
    fontFace: FONT.heading,
    fontSize: 12,
    color: TOKENS.mutedOnDark,
    lineSpacingMultiple: 1.3,
  });

  const propFirstY = 4.55;
  const propStep = 0.56;
  const propH = 0.4;
  content.whyUs.valueProps.forEach((prop, i) => {
    slide.addText(prop, {
      ...BOX,
      x: ML,
      y: propFirstY + i * propStep,
      w: TW,
      h: propH,
      fontFace: FONT.heading,
      fontSize: 13,
      color: TOKENS.coverFg,
      lineSpacingMultiple: 1.15,
    });
  });

  // The CTA clears the value props rather than sitting at a fixed height a
  // longer list would run into.
  const propsBottom = propFirstY + (content.whyUs.valueProps.length - 1) * propStep + propH;
  const ctaY = Math.max(7.14, propsBottom + 0.51);
  const ctaH = 1.6;
  const ctaPad = 0.3;
  slide.addShape(pptx.ShapeType.rect, {
    x: ML,
    y: ctaY,
    w: TW,
    h: ctaH,
    fill: { type: "none" },
    line: { color: TOKENS.ghostDark, width: 1 },
  });
  slide.addText(content.whyUs.cta, {
    ...BOX,
    x: ML + ctaPad,
    y: ctaY + 0.35,
    w: TW - ctaPad * 2,
    h: 0.5,
    fontFace: FONT.heading,
    italic: true,
    fontSize: 17,
    color: TOKENS.coverFg,
    align: "center",
  });
  slide.addText(`${company.phone}   ·   ${company.email}   ·   ${company.website}`, {
    ...BOX,
    x: ML + ctaPad,
    y: ctaY + 1.0,
    w: TW - ctaPad * 2,
    h: 0.3,
    fontFace: FONT.mono,
    bold: true,
    fontSize: 11,
    color: TOKENS.mutedOnDark,
    align: "center",
  });

  footer(slide, pptx, content.labels.footerCompany, 7, true);
}

/**
 * Renders a proposal deck. Takes the whole content document and the shared
 * company details — there is no other input, and no client content lives in
 * this module.
 */
export async function buildProposalPptx(
  content: ProposalContent,
  company: CompanyDetails,
): Promise<Buffer> {
  // QA gate: colors are fixed for every client, so this is a pure token
  // check against the configured brand — fails before any slide is built.
  runProposalContrastGate(company);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "A4P", width: PAGE_W, height: PAGE_H });
  pptx.layout = "A4P";

  const ctx: Ctx = { content, company };
  buildCoverSlide(pptx, ctx);
  buildProblemSlide(pptx, ctx);
  buildSolutionSlide(pptx, ctx);
  buildTimelineSlide(pptx, ctx);
  buildInvestmentSlide(pptx, ctx);
  buildScopeSlide(pptx, ctx);
  buildClosingSlide(pptx, ctx);

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}

export { totalTimelineWeeks };
