import { PALETTE } from "@repo/ui/palette";

const L = PALETTE.light;
const D = PALETTE.dark;

export const DECK_COLORS = {
  paper: L["n-0"],
  ink: L["n-8"],
  inkTitle: L["n-8"],
  body: L["muted-foreground"],
  bodyWarm: L["n-5"],
  label: L["n-6"],
  muted: L["n-5"],
  hairline: L["n-2"],
  ruleWarm: L["n-3"],
  numeralWarm: L["n-4"],

  darkBg: D.background,
  coverFg: D.foreground,
  mutedOnDark: D["muted-foreground"],
  ghostDark: D["surface-2"],
} as const;

export const CONTRACT_COLORS = {
  body: L["muted-foreground"],
  notice: L.warning,
  rule: L["n-2"],
  footer: L["n-4"],
} as const;
