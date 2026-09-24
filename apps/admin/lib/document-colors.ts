import { PALETTE } from "@repo/ui/palette";

const L = PALETTE.light;
const D = PALETTE.dark;

/**
 * The proposal deck's colors, by role, resolved from the one palette
 * (`@repo/ui/palette`, which mirrors the CSS tokens). The builder paints with
 * these and the contrast gate checks these — one table, so the gate can never
 * pass a color the deck does not actually use.
 */
export const DECK_COLORS = {
  // light surface (slides 2-6)
  paper: L["n-0"],
  ink: L["n-8"],
  inkTitle: L["n-8"], // problem-card titles
  body: L["muted-foreground"], // descriptions
  bodyWarm: L["n-5"], // problem-card descriptions
  label: L["n-6"], // eyebrows, footers, mono labels
  muted: L["n-5"], // captions, quote, bar labels, split segment 1
  hairline: L["n-2"],
  ruleWarm: L["n-3"], // problem-card left rule
  numeralWarm: L["n-4"], // problem-card index numerals (decorative)

  // dark surface (slides 1 + 7)
  darkBg: D.background,
  coverFg: D.foreground,
  mutedOnDark: D["muted-foreground"],
  ghostDark: D["surface-2"], // ghost numeral, dot grid, crop marks, CTA border
} as const;

/** The contract document's colors. */
export const CONTRACT_COLORS = {
  body: L["muted-foreground"],
  notice: L.warning, // the draft-for-legal-review banner
  rule: L["n-2"],
  footer: L["n-4"],
} as const;
