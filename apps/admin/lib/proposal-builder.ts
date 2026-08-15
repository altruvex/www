import PptxGenJS from "pptxgenjs";
import type { Client, Proposal } from "@repo/database";
import { getIntentAccent } from "./intent-accent";
import {
  getPerformanceTargets,
  getProblems,
  getProgressTargets,
  getSolutionModules,
  getTimelinePhases,
  projectTypeLabel,
  complexityLabel,
  type LineItem,
} from "./proposal-content";
import type { ProjectType, Complexity } from "@repo/pricing";

// ---- Locked design system (ported from ~/.claude/skills/altruvex-proposal) ----
// Base tokens are permanent — they ARE the live site's tokens converted to
// hex. Never change these without updating globals.css and this file together.
const TOKENS = {
  paper: "FAFAFA",
  darkBg: "121212",
  shapeDark: "171717",
  shapeLight: "E8E8E8",
  splitMid: "525252",
  ink: "0F0F0F",
  body: "666666",
  mid: "525252",
  light: "A6A6A6",
  coverFg: "F0F0F0",
};

const FONT = {
  display: "Georgia",
  heading: "Trebuchet MS",
  mono: "Courier New",
};

const ML = 0.65;
const MR = 0.65;
const MT = 0.65;
const MB = 0.55;
const PAGE_W = 8.27;
const PAGE_H = 11.69;
const TW = PAGE_W - ML - MR;

const CONTACT = {
  phone: "+20 102 312 5493",
  email: "hello@altruvex.com",
  website: "altruvex.com",
};

const VALUE_PROPS = [
  "Your platform reflects your brand identity precisely — no compromise.",
  "You own the system outright — no third-party dependency or platform subscription.",
  "Performance that converts — fast load, smooth UX, mobile-first.",
  "You own the codebase — no vendor lock-in, no platform risk.",
];

const WHY_BODY =
  "Altruvex is a high-precision web engineering company. Every project is owned end-to-end: architecture, design, development, and delivery. You get a system built right the first time — not assembled from templates and plugins.";

const STANDARD_TERMS: [string, string][] = [
  ["VALIDITY", "Proposal valid for 30 days from the proposal date."],
  ["PAYMENT", "50% to start · 30% at milestone · 20% before launch. No deposit = no project start."],
  ["TIMELINE", "Starts after first payment + confirmed brief."],
  ["LAUNCH", "Client reviews on Altruvex staging; live domain pointed after final payment."],
  ["CONTENT", "Client provides all text, images, brand assets, and access credentials."],
  ["REVISIONS", "3 rounds included. Additional at 800 EGP/hr."],
  ["OWNERSHIP", "Full source code ownership transfers to client upon final payment."],
  ["SUPPORT", "30 days of post-launch support for critical fixes included."],
];

const SCOPE_INCLUDED = [
  "Custom design & development",
  "Responsive, mobile-first build",
  "Bilingual-ready content layer",
  "Domain, SSL & Year 1 hosting setup",
  "3 rounds of revisions",
  "30 days post-launch support",
];

const SCOPE_NOT_INCLUDED = [
  "Branding from scratch",
  "Copywriting",
  "Paid stock / premium assets",
  "SMS / email credits",
  "Third-party subscriptions",
  "Ongoing retainer (quoted separately)",
];

type ProposalWithClient = Proposal & { client: Client };

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function hairline(slide: PptxGenJS.Slide, pptx: PptxGenJS, x: number, y: number, w: number) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.01,
    fill: { color: TOKENS.shapeLight },
    line: { color: TOKENS.shapeLight, width: 0 },
  });
}

function dotGrid(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  x: number,
  y: number,
  cols: number,
  rows: number,
  color: string,
) {
  const gap = 0.14;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: x + col * gap,
        y: y + row * gap,
        w: 0.05,
        h: 0.05,
        fill: { color },
        line: { color, width: 0 },
      });
    }
  }
}

function footer(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  companyName: string,
  pageNumber: number,
) {
  hairline(slide, pptx, ML, PAGE_H - MB - 0.05, TW);
  slide.addText(companyName.toUpperCase(), {
    x: ML,
    y: PAGE_H - MB,
    w: TW / 2,
    h: 0.3,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    align: "left",
  });
  slide.addText(String(pageNumber).padStart(2, "0"), {
    x: ML + TW / 2,
    y: PAGE_H - MB,
    w: TW / 2,
    h: 0.3,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    align: "right",
  });
}

function eyebrow(slide: PptxGenJS.Slide, x: number, y: number, w: number, text: string) {
  slide.addText(text.toUpperCase(), {
    x,
    y,
    w,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    charSpacing: 3,
    align: "left",
  });
}

// ---- Slide 1 — Cover ----
function buildCoverSlide(
  pptx: PptxGenJS,
  proposal: ProposalWithClient,
  intent: ReturnType<typeof getIntentAccent>,
) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.darkBg };

  const dateStr = new Date(proposal.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  slide.addText(
    `ALTRUVEX · WEB ENGINEERING · PROJECT PROPOSAL · ${dateStr}`,
    {
      x: ML,
      y: MT,
      w: TW,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.light,
      charSpacing: 2,
    },
  );

  dotGrid(slide, pptx, PAGE_W - MR - 0.7, MT, 5, 4, TOKENS.shapeDark);

  // Ghost page number
  slide.addText("01", {
    x: ML - 0.1,
    y: 2.6,
    w: 5,
    h: 2.5,
    fontFace: FONT.heading,
    bold: true,
    fontSize: 180,
    color: TOKENS.shapeDark,
  });

  // Left accent rail
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.04,
    h: PAGE_H,
    fill: { color: intent.dark },
    line: { color: intent.dark, width: 0 },
  });

  slide.addText(
    [
      { text: "Project", options: { fontFace: FONT.display, fontSize: 64, color: TOKENS.coverFg, breakLine: true } },
      { text: "Proposal.", options: { fontFace: FONT.display, fontSize: 64, italic: true, color: TOKENS.mid } },
    ],
    { x: ML, y: 4.6, w: TW, h: 2.2 },
  );

  // Client block with corner-bracket feel via hairlines
  const blockY = 8.1;
  hairline(slide, pptx, ML, blockY, 1.6);
  slide.addText("PREPARED FOR", {
    x: ML,
    y: blockY + 0.15,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    charSpacing: 3,
  });
  slide.addText(
    `CUSTOM ${(proposal.client.industry ?? projectTypeLabel(proposal.projectType as ProjectType)).toUpperCase()} PLATFORM`,
    {
      x: ML,
      y: blockY + 0.4,
      w: TW,
      h: 0.25,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.light,
      charSpacing: 3,
    },
  );
  slide.addText(proposal.client.company || proposal.client.name || "Client", {
    x: ML,
    y: blockY + 0.75,
    w: TW,
    h: 0.5,
    fontFace: FONT.heading,
    bold: true,
    fontSize: 28,
    color: TOKENS.coverFg,
  });
  slide.addText(
    `${proposal.client.name ?? "Client"} – ${proposal.client.company ?? "Company Name"}`,
    {
      x: ML,
      y: blockY + 1.3,
      w: TW,
      h: 0.3,
      fontFace: FONT.heading,
      fontSize: 13,
      color: TOKENS.mid,
    },
  );

  slide.addText(
    `${CONTACT.phone}   ·   ${CONTACT.email}   ·   ${CONTACT.website}`,
    {
      x: ML,
      y: PAGE_H - MB - 0.05,
      w: TW,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.mid,
    },
  );
}

// ---- Slide 2 — Project Understanding ----
function buildProblemSlide(pptx: PptxGenJS, proposal: ProposalWithClient) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  eyebrow(slide, ML, MT, TW, "02 — Project Understanding");
  slide.addText(
    [
      { text: "Where things stand ", options: { fontFace: FONT.heading, bold: true, fontSize: 18, color: TOKENS.ink } },
      { text: "today.", options: { fontFace: FONT.display, italic: true, fontSize: 18, color: TOKENS.mid } },
    ],
    { x: ML, y: MT + 0.35, w: TW, h: 0.4 },
  );
  slide.addText(
    "Before proposing a solution, here's our read on the problem this project needs to solve.",
    { x: ML, y: MT + 0.85, w: TW, h: 0.4, fontFace: FONT.heading, fontSize: 12, color: TOKENS.body },
  );

  const problems = getProblems(proposal.projectType as ProjectType);
  const cardY = MT + 1.6;
  const cardH = 1.55;
  const gap = 0.25;

  problems.forEach((problem, i) => {
    const y = cardY + i * (cardH + gap);
    slide.addShape(pptx.ShapeType.rect, {
      x: ML,
      y,
      w: 0.025,
      h: cardH,
      fill: { color: TOKENS.shapeLight },
      line: { color: TOKENS.shapeLight, width: 0 },
    });
    slide.addText(String(i + 1).padStart(2, "0"), {
      x: ML + 0.2,
      y,
      w: 0.6,
      h: 0.4,
      fontFace: FONT.mono,
      fontSize: 13,
      color: TOKENS.light,
    });
    slide.addText(problem.title, {
      x: ML + 0.2,
      y: y + 0.35,
      w: TW - 0.2,
      h: 0.4,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 13.75,
      color: TOKENS.ink,
    });
    slide.addText(problem.description, {
      x: ML + 0.2,
      y: y + 0.75,
      w: TW - 0.4,
      h: 0.7,
      fontFace: FONT.heading,
      fontSize: 11,
      color: TOKENS.body,
    });
  });

  slide.addText(
    `“Good engineering starts with an honest read of the problem — not a template.”`,
    {
      x: ML,
      y: cardY + problems.length * (cardH + gap) + 0.2,
      w: TW,
      h: 0.4,
      fontFace: FONT.mono,
      italic: true,
      fontSize: 11,
      color: TOKENS.mid,
    },
  );

  footer(slide, pptx, "Altruvex", 2);
}

// ---- Slide 3 — Proposed Solution ----
function buildSolutionSlide(pptx: PptxGenJS, proposal: ProposalWithClient, intent: ReturnType<typeof getIntentAccent>) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  eyebrow(slide, ML, MT, TW, "03 — Proposed Solution");
  slide.addText(
    [
      { text: "What we'll ", options: { fontFace: FONT.heading, bold: true, fontSize: 18, color: TOKENS.ink } },
      { text: "build.", options: { fontFace: FONT.display, italic: true, fontSize: 18, color: TOKENS.mid } },
    ],
    { x: ML, y: MT + 0.35, w: TW, h: 0.4 },
  );

  const modules = getSolutionModules(proposal.projectType as ProjectType);
  const gridY = MT + 1.0;
  const cardW = (TW - 0.25) / 2;
  const cardH = 1.5;

  modules.forEach((module, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = ML + col * (cardW + 0.25);
    const y = gridY + row * (cardH + 0.25);

    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: TOKENS.paper },
      line: { color: TOKENS.shapeLight, width: 0.75 },
    });
    slide.addText(String(i + 1).padStart(2, "0"), {
      x: x + cardW - 0.7,
      y: y + cardH - 0.55,
      w: 0.6,
      h: 0.4,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 28,
      color: TOKENS.shapeLight,
      align: "right",
    });
    slide.addText(module.title, {
      x: x + 0.2,
      y: y + 0.2,
      w: cardW - 0.4,
      h: 0.4,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 13,
      color: TOKENS.ink,
    });
    slide.addText(module.description, {
      x: x + 0.2,
      y: y + 0.6,
      w: cardW - 0.4,
      h: 0.8,
      fontFace: FONT.heading,
      fontSize: 10.5,
      color: TOKENS.body,
    });
  });

  const targetsY = gridY + 2 * (cardH + 0.25) + 0.3;
  const targets = getPerformanceTargets();
  const targetW = TW / targets.length;
  targets.forEach((target, i) => {
    slide.addText(target, {
      x: ML + i * targetW,
      y: targetsY,
      w: targetW,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.mid,
      align: i === 0 ? "left" : i === targets.length - 1 ? "right" : "center",
    });
  });

  const bars = getProgressTargets();
  const barsY = targetsY + 0.5;
  const barH = 0.14;
  const barGap = 0.55;

  bars.forEach((bar, i) => {
    const y = barsY + i * barGap;
    slide.addText(bar.label, {
      x: ML,
      y: y - 0.28,
      w: TW - 1,
      h: 0.25,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.mid,
    });
    slide.addText(`${bar.percent}%`, {
      x: ML + TW - 1,
      y: y - 0.28,
      w: 1,
      h: 0.25,
      fontFace: FONT.mono,
      fontSize: 11.25,
      color: intent.light,
      align: "right",
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: ML,
      y,
      w: TW,
      h: barH,
      fill: { color: TOKENS.shapeLight },
      line: { color: TOKENS.shapeLight, width: 0 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: ML,
      y,
      w: (TW * bar.percent) / 100,
      h: barH,
      fill: { color: TOKENS.ink },
      line: { color: TOKENS.ink, width: 0 },
    });
  });

  footer(slide, pptx, "Altruvex", 3);
}

// ---- Slide 4 — Timeline ----
function buildTimelineSlide(pptx: PptxGenJS, proposal: ProposalWithClient, intent: ReturnType<typeof getIntentAccent>) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  eyebrow(slide, ML, MT, TW, "04 — Timeline");
  slide.addText(
    [
      { text: "How we'll ", options: { fontFace: FONT.heading, bold: true, fontSize: 18, color: TOKENS.ink } },
      { text: "get there.", options: { fontFace: FONT.display, italic: true, fontSize: 18, color: TOKENS.mid } },
    ],
    { x: ML, y: MT + 0.35, w: TW, h: 0.4 },
  );

  const phases = getTimelinePhases(
    proposal.projectType as ProjectType,
    proposal.timelineWeeks,
  );
  const rowsY = MT + 1.0;
  const rowH = 0.55;

  slide.addShape(pptx.ShapeType.line, {
    x: ML + 0.12,
    y: rowsY,
    w: 0,
    h: phases.length * rowH,
    line: { color: TOKENS.shapeLight, width: 1 },
  });

  phases.forEach((phase, i) => {
    const y = rowsY + i * rowH;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: ML,
      y: y + 0.08,
      w: 0.24,
      h: 0.24,
      fill: { color: i === 0 ? TOKENS.ink : TOKENS.paper },
      line: { color: TOKENS.mid, width: 1 },
    });
    slide.addText(String(i + 1).padStart(2, "0"), {
      x: ML + 0.4,
      y,
      w: 0.5,
      h: 0.4,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.light,
    });
    slide.addText(phase.name, {
      x: ML + 0.9,
      y,
      w: 2.4,
      h: 0.4,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 13.75,
      color: TOKENS.ink,
    });
    slide.addText(phase.deliverable, {
      x: ML + 3.3,
      y,
      w: 2.9,
      h: 0.4,
      fontFace: FONT.heading,
      fontSize: 12.5,
      color: TOKENS.body,
    });
    slide.addText(`${phase.weeks}W`, {
      x: ML + TW - 0.7,
      y,
      w: 0.7,
      h: 0.4,
      fontFace: FONT.mono,
      fontSize: 12.5,
      color: TOKENS.mid,
      align: "right",
    });
  });

  const chartY = rowsY + phases.length * rowH + 0.4;
  const chartH = 1.1;
  const barW = (TW - (phases.length - 1) * 0.1) / phases.length;
  const maxWeeks = Math.max(...phases.map((p) => p.weeks));

  phases.forEach((phase, i) => {
    const h = (phase.weeks / maxWeeks) * chartH;
    slide.addShape(pptx.ShapeType.rect, {
      x: ML + i * (barW + 0.1),
      y: chartY + (chartH - h),
      w: barW,
      h,
      fill: { color: i === 0 ? intent.light : TOKENS.ink },
      line: { color: i === 0 ? intent.light : TOKENS.ink, width: 0 },
    });
    slide.addText(`W${phase.weeks}`, {
      x: ML + i * (barW + 0.1),
      y: chartY + chartH + 0.05,
      w: barW,
      h: 0.2,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.light,
      align: "center",
    });
  });

  slide.addText(
    `Total: ${proposal.timelineWeeks} weeks from kickoff to launch — assumes on-time content and feedback.`,
    {
      x: ML,
      y: chartY + chartH + 0.35,
      w: TW,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.light,
    },
  );

  footer(slide, pptx, "Altruvex", 4);
}

// ---- Slide 5 — Investment ----
function buildInvestmentSlide(
  pptx: PptxGenJS,
  proposal: ProposalWithClient,
  intent: ReturnType<typeof getIntentAccent>,
) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  eyebrow(slide, ML, MT, TW, "05 — Investment");
  slide.addText(
    [
      { text: "What it ", options: { fontFace: FONT.heading, bold: true, fontSize: 18, color: TOKENS.ink } },
      { text: "costs.", options: { fontFace: FONT.display, italic: true, fontSize: 18, color: TOKENS.mid } },
    ],
    { x: ML, y: MT + 0.35, w: TW, h: 0.4 },
  );

  const lineItems = (proposal.lineItems as unknown as LineItem[]) ?? [];
  const headerY = MT + 1.0;
  slide.addText("ITEM", {
    x: ML,
    y: headerY,
    w: TW * 0.7,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    charSpacing: 2,
  });
  slide.addText("AMOUNT", {
    x: ML + TW * 0.7,
    y: headerY,
    w: TW * 0.3,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    charSpacing: 2,
    align: "right",
  });
  hairline(slide, pptx, ML, headerY + 0.3, TW);

  const rowH = 0.42;
  let itemY = headerY + 0.45;
  for (const item of lineItems) {
    slide.addText(item.name, {
      x: ML,
      y: itemY,
      w: TW * 0.7,
      h: rowH,
      fontFace: FONT.heading,
      fontSize: 13.75,
      color: TOKENS.ink,
      valign: "middle",
    });
    slide.addText(formatCurrency(item.amount, proposal.currency), {
      x: ML + TW * 0.7,
      y: itemY,
      w: TW * 0.3,
      h: rowH,
      fontFace: FONT.mono,
      fontSize: 13.75,
      color: TOKENS.ink,
      align: "right",
      valign: "middle",
    });
    itemY += rowH;
  }

  hairline(slide, pptx, ML, itemY + 0.05, TW);
  const totalY = itemY + 0.2;
  slide.addText("TOTAL INVESTMENT", {
    x: ML,
    y: totalY,
    w: TW * 0.6,
    h: 0.4,
    fontFace: FONT.heading,
    bold: true,
    italic: true,
    fontSize: 14,
    color: TOKENS.ink,
    valign: "middle",
  });
  slide.addText(formatCurrency(proposal.totalPrice, proposal.currency), {
    x: ML + TW * 0.4,
    y: totalY,
    w: TW * 0.6,
    h: 0.4,
    fontFace: FONT.mono,
    bold: true,
    fontSize: 14.38,
    color: intent.light,
    align: "right",
    valign: "middle",
  });

  const split = proposal.paymentSplit as unknown as {
    first: number;
    second: number;
    final: number;
  };
  const splitY = totalY + 0.65;
  const splitH = 0.4;
  const firstW = (TW * split.first) / 100;
  const secondW = (TW * split.second) / 100;
  const finalW = (TW * split.final) / 100;

  const splitSegments: [number, string, string][] = [
    [firstW, TOKENS.light, `${split.first}%`],
    [secondW, TOKENS.splitMid, `${split.second}%`],
    [finalW, TOKENS.ink, `${split.final}%`],
  ];
  let segX = ML;
  for (const [w, color, label] of splitSegments) {
    slide.addShape(pptx.ShapeType.rect, {
      x: segX,
      y: splitY,
      w,
      h: splitH,
      fill: { color },
      line: { color, width: 0 },
    });
    slide.addText(label, {
      x: segX,
      y: splitY,
      w,
      h: splitH,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.coverFg,
      align: "center",
      valign: "middle",
    });
    segX += w;
  }

  const paymentRows: [string, string, number][] = [
    ["First Payment", "Upon contract signing + confirmed brief", (proposal.totalPrice * split.first) / 100],
    ["Second Payment", "Upon design approval by client", (proposal.totalPrice * split.second) / 100],
    ["Final Payment", "Prior to launch (staging → live domain)", (proposal.totalPrice * split.final) / 100],
  ];
  let payY = splitY + splitH + 0.25;
  for (const [label, trigger, amount] of paymentRows) {
    slide.addText(label, {
      x: ML,
      y: payY,
      w: 1.9,
      h: 0.35,
      fontFace: FONT.heading,
      bold: true,
      fontSize: 11,
      color: TOKENS.ink,
    });
    slide.addText(trigger, {
      x: ML + 1.9,
      y: payY,
      w: TW - 1.9 - 1.4,
      h: 0.35,
      fontFace: FONT.mono,
      fontSize: 11,
      color: TOKENS.body,
    });
    slide.addText(formatCurrency(Math.round(amount), proposal.currency), {
      x: ML + TW - 1.4,
      y: payY,
      w: 1.4,
      h: 0.35,
      fontFace: FONT.mono,
      fontSize: 12,
      color: TOKENS.ink,
      align: "right",
    });
    payY += 0.4;
  }

  slide.addText(
    `Valid until ${new Date(proposal.validUntil).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    {
      x: ML,
      y: payY + 0.2,
      w: TW,
      h: 0.3,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.light,
    },
  );

  footer(slide, pptx, "Altruvex", 5);
}

// ---- Slide 6 — Scope & Terms ----
function buildScopeSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.paper };

  eyebrow(slide, ML, MT, TW, "06 — Scope & Terms");
  slide.addText(
    [
      { text: "What's ", options: { fontFace: FONT.heading, bold: true, fontSize: 18, color: TOKENS.ink } },
      { text: "included.", options: { fontFace: FONT.display, italic: true, fontSize: 18, color: TOKENS.mid } },
    ],
    { x: ML, y: MT + 0.35, w: TW, h: 0.4 },
  );

  const colW = (TW - 0.4) / 2;
  const colY = MT + 1.0;

  slide.addText("INCLUDED", {
    x: ML,
    y: colY,
    w: colW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    charSpacing: 2,
  });
  slide.addText("NOT INCLUDED", {
    x: ML + colW + 0.4,
    y: colY,
    w: colW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    charSpacing: 2,
  });

  const itemH = 0.32;
  SCOPE_INCLUDED.forEach((item, i) => {
    slide.addText(`—  ${item}`, {
      x: ML,
      y: colY + 0.35 + i * itemH,
      w: colW,
      h: itemH,
      fontFace: FONT.heading,
      fontSize: 10,
      color: TOKENS.ink,
    });
  });
  SCOPE_NOT_INCLUDED.forEach((item, i) => {
    slide.addText(`—  ${item}`, {
      x: ML + colW + 0.4,
      y: colY + 0.35 + i * itemH,
      w: colW,
      h: itemH,
      fontFace: FONT.heading,
      fontSize: 10,
      color: TOKENS.body,
    });
  });

  const termsY = colY + 0.35 + SCOPE_INCLUDED.length * itemH + 0.4;
  hairline(slide, pptx, ML, termsY, TW);
  slide.addText("KEY TERMS", {
    x: ML,
    y: termsY + 0.15,
    w: TW,
    h: 0.25,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    charSpacing: 2,
  });

  const termRowH = 0.32;
  STANDARD_TERMS.forEach(([key, value], i) => {
    const y = termsY + 0.5 + i * termRowH;
    slide.addText(key, {
      x: ML,
      y,
      w: 1.3,
      h: termRowH,
      fontFace: FONT.mono,
      fontSize: 8.75,
      color: TOKENS.light,
    });
    slide.addText(value, {
      x: ML + 1.3,
      y,
      w: TW - 1.3,
      h: termRowH,
      fontFace: FONT.heading,
      fontSize: 10,
      color: TOKENS.body,
    });
  });

  footer(slide, pptx, "Altruvex", 6);
}

// ---- Slide 7 — Why Altruvex ----
function buildClosingSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  slide.background = { color: TOKENS.darkBg };

  eyebrow(slide, ML, MT, TW, "07 — Why Altruvex");
  slide.addText("Why Altruvex", {
    x: ML,
    y: MT + 0.35,
    w: TW,
    h: 0.4,
    fontFace: FONT.heading,
    bold: true,
    fontSize: 18,
    color: TOKENS.coverFg,
  });

  slide.addText(
    [
      { text: "We don't build templates.", options: { fontFace: FONT.display, fontSize: 22, color: TOKENS.coverFg, breakLine: true } },
      { text: "We engineer systems.", options: { fontFace: FONT.display, italic: true, fontSize: 22, color: TOKENS.mid } },
    ],
    { x: ML, y: MT + 0.95, w: TW, h: 1.1 },
  );

  slide.addText(WHY_BODY, {
    x: ML,
    y: MT + 2.3,
    w: 4.32,
    h: 1.2,
    fontFace: FONT.heading,
    fontSize: 10.5,
    color: TOKENS.mid,
  });

  let propY = MT + 3.8;
  VALUE_PROPS.forEach((prop) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: ML,
      y: propY + 0.06,
      w: 0.08,
      h: 0.08,
      fill: { color: TOKENS.coverFg },
      line: { color: TOKENS.coverFg, width: 0 },
    });
    slide.addText(prop, {
      x: ML + 0.25,
      y: propY,
      w: TW - 0.25,
      h: 0.32,
      fontFace: FONT.heading,
      fontSize: 12,
      color: TOKENS.coverFg,
    });
    propY += 0.42;
  });

  const ctaY = propY + 0.3;
  const ctaH = 1.3;
  slide.addShape(pptx.ShapeType.rect, {
    x: ML,
    y: ctaY,
    w: TW,
    h: ctaH,
    fill: { color: TOKENS.shapeDark },
    line: { color: TOKENS.shapeDark, width: 0 },
  });
  slide.addText("Ready to build the system your business deserves?", {
    x: ML + 0.3,
    y: ctaY + 0.25,
    w: TW - 0.6,
    h: 0.5,
    fontFace: FONT.heading,
    italic: true,
    fontSize: 16,
    color: TOKENS.coverFg,
    align: "center",
  });
  slide.addText(`${CONTACT.phone}   ·   ${CONTACT.email}   ·   ${CONTACT.website}`, {
    x: ML,
    y: ctaY + ctaH - 0.4,
    w: TW,
    h: 0.3,
    fontFace: FONT.mono,
    fontSize: 8.75,
    color: TOKENS.light,
    align: "center",
  });

  footer(slide, pptx, "Altruvex", 7);
}

export async function buildProposalPptx(
  proposal: ProposalWithClient,
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "A4P", width: PAGE_W, height: PAGE_H });
  pptx.layout = "A4P";

  const intent = getIntentAccent(proposal.accentName);

  buildCoverSlide(pptx, proposal, intent);
  buildProblemSlide(pptx, proposal);
  buildSolutionSlide(pptx, proposal, intent);
  buildTimelineSlide(pptx, proposal, intent);
  buildInvestmentSlide(pptx, proposal, intent);
  buildScopeSlide(pptx);
  buildClosingSlide(pptx);

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}

export { projectTypeLabel, complexityLabel };
export type { ProjectType, Complexity };
