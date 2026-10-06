import type { AppName, Rule } from "./types";
import { sharedExportNames } from "./shared-exports";

/** File kinds the auditor reads. */
export type Ext = "tsx" | "ts" | "css" | "mdx";

/** One line of a scanned file, with comments (and MDX code) blanked out. */
export interface LineContext {
  app: AppName;
  /** absolute path of the repo root (the folder with turbo.json) */
  repoRoot: string;
  /** repo-relative, forward slashes */
  file: string;
  ext: Ext;
  /** the line with comments masked to spaces — columns match `raw` */
  code: string;
  raw: string;
  /** 0-based */
  index: number;
  /** every masked line of the file, for short look-backs */
  codeLines: readonly string[];
}

export interface FileContext {
  app: AppName;
  /** absolute path of the repo root (the folder with turbo.json) */
  repoRoot: string;
  file: string;
  ext: Ext;
  codeLines: readonly string[];
  /** every unmasked line, for rules that read comments */
  rawLines: readonly string[];
}

/** A match on a line: 0-based column + the offending text. */
export interface Hit {
  index: number;
  match: string;
}

/** A match from a file-level check: 0-based line and column. */
export interface FileHit extends Hit {
  line: number;
}

export interface RuleCheck {
  rule: Rule;
  exts: readonly Ext[];
  /** true = do not run this rule on that file */
  skipFile?: (file: string, app: AppName) => boolean;
  line?: (ctx: LineContext) => Hit[];
  file?: (ctx: FileContext) => FileHit[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Every match of a global regex, optionally filtered. */
function hits(
  re: RegExp,
  s: string,
  keep?: (m: RegExpExecArray) => boolean,
): Hit[] {
  const out: Hit[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    if (!keep || keep(m)) out.push({ index: m.index, match: m[0] });
  }
  return out;
}

/**
 * True when position `idx` sits inside a Tailwind arbitrary value (`bg-[#fff]`,
 * `[color:#fff]`) — those are reported once, by `color-arbitrary-value`.
 */
function insideBrackets(line: string, idx: number): boolean {
  for (let j = idx - 1; j >= 0; j--) {
    const c = line[j];
    if (c === "[") return true;
    if (c === "]" || c === " " || c === '"' || c === "'" || c === "`") {
      return false;
    }
  }
  return false;
}

/** lib/motion and the GSAP registration file are where motion literals belong (MOTION.md §1). */
const inMotionLib = (file: string): boolean =>
  file.startsWith("apps/www/lib/motion/") || file === "apps/www/lib/utils/gsap.ts";

const LOGO_FILE = "packages/ui/src/components/brand/altruvex-logo.tsx";
const FOOTER_FILE = "apps/www/components/layout/footer.tsx";
const EMPHASIS_FILE = "packages/ui/src/www/emphasis.tsx";

/** Files that render outside the browser (satori OG images, PDF/HTML strings). */
const isImageGenerator = (file: string): boolean =>
  /\/(opengraph-image|twitter-image|icon|apple-icon)\.tsx$/.test(file);

/** Class-name boundary: not preceded by a word char or a hyphen. */
const B = "(?<![\\w-])";

/** Colour-taking utility prefixes. */
const COLOR_UTIL =
  "(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|divide|fill|stroke|from|via|to|shadow|decoration|caret|accent|placeholder)";

const TW_PALETTE =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";

const CORNER = "(?:-(?:t|b|l|r|s|e|x|y|tl|tr|bl|br|ss|se|es|ee|ts|te|bs|be))?";

const SRC_EDGE = "docs/edge-system-2026-09.md";
const SRC_PRINCIPLES = "docs/design-principles.md";
const SRC_MOTION = "apps/www/MOTION.md";
const SRC_TOKENS = "packages/ui/src/styles/tokens.css";
const SRC_GLOBALS = "apps/www/app/globals.css";
const SRC_ARCH = "docs/claude/architecture.md";

const ALL: AppName[] = ["www", "admin", "ui"];

// ─── one source for shared UI ───────────────────────────────────────────────

/** The reuse rules also scan the brand app: its specimens are where a mirror copy hid before. */
const REUSE_APPS: AppName[] = ["www", "admin", "brand"];

/** The audit's own rule sources name the patterns they look for. */
const isAuditSource = (file: string): boolean => file.startsWith("apps/brand/lib/audit/");
const SRC_BRIEF = "docs/edge-system-2026-09.md";

/** apps/<app>/components/** — where a shared piece is most easily copied. */
const inAppComponents = (file: string): boolean => /^apps\/(?:www|admin|brand)\/components\//.test(file);

/** Names a file imports from @repo/ui or @repo/ui/* (the original name, not the local alias). */
function importedFromUi(codeLines: readonly string[]): Set<string> {
  const out = new Set<string>();
  const text = codeLines.join("\n");
  const re = /\bimport\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*["']@repo\/ui(?:\/[^"']*)?["']/g;
  for (const m of text.matchAll(re)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0];
      if (name) out.add(name);
    }
  }
  return out;
}

const EXPORT_DECL_RE =
  /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/g;

/** "Mirrors …" / "keep it in step" — a comment that admits the code is a copy. */
const MIRROR_COMMENT_RE =
  /\bMirrors\b|\b(?:mirrors|mirrored from|copied from)\s+(?:the\s+)?(?:@repo\/ui|packages\/ui)|\bkeep(?:s)?\s+(?:it\s+)?in\s+(?:step|sync)\b|\bin step with\b/gi;

/**
 * Primitive libraries apps must reach through @repo/ui. Each exception is one
 * module with the reason it is allowed; `onlyIf` narrows it to files that also
 * use the shared surface.
 */
const PRIMITIVE_MODULE_RE = /^(?:@radix-ui\/[\w-]+|radix-ui|vaul|cmdk|react-day-picker)$/;
const PRIMITIVE_IMPORT_EXCEPTIONS: readonly { module: string; reason: string; onlyIf?: RegExp }[] = [
  {
    module: "@radix-ui/react-slot",
    reason: "Slot is the asChild merge primitive, not a component; nothing in @repo/ui wraps it.",
  },
  {
    module: "cmdk",
    reason: "cmdk has no @repo/ui wrapper yet; a command list is allowed while it wears the shared menu classes.",
    onlyIf: /\b(?:menuSurface|menuItem)\b/,
  },
];

const PRIMITIVE_IMPORT_RE =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']((?:@radix-ui\/[\w-]+|radix-ui|vaul|cmdk|react-day-picker)(?:\/[^"']*)?)["']/g;

// ─── colour ────────────────────────────────────────────────────────────────

const HEX_RE = /(?<![\w&#/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const COLOR_FN_RE = /(?<![\w-])(?:rgba?|hsla?|oklch|oklab)\(\s*[-\d.]/g;
const COLOR_ARBITRARY_RE = new RegExp(
  `${B}-?${COLOR_UTIL}-\\[(?:#|(?:rgba?|hsla?|oklch|oklab)\\((?!\\s*var\\()|color:#)[^\\]\\s]*\\]` +
    `|${B}\\[(?:color|background(?:-color)?|border(?:-[a-z]+)?-color|fill|stroke):\\s*(?:#|rgba?\\(|hsla?\\(|oklch\\()[^\\]\\s]*\\]`,
  "g",
);
const TW_PALETTE_RE = new RegExp(
  `${B}-?${COLOR_UTIL}-${TW_PALETTE}-(?:50|[1-9]00|950)(?![\\w-])`,
  "g",
);
/** Solid black only: `black/80` is a photo scrim, not ink. */
const PURE_BLACK_RE = new RegExp(
  `${B}(?:bg|text|border(?:-[trblxyse])?|ring|outline|divide|fill|stroke|from|via|to|shadow|decoration|caret)-black(?![\\w/-])`,
  "g",
);
/** A fixed px/rem size in brackets; em, vw, clamp() and length:inherit are other cases. */
const ARBITRARY_TEXT_SIZE_RE = /(?<![\w-])text-\[\d*\.?\d+(?:px|rem)\]/g;

// ─── radius / border / shadow ──────────────────────────────────────────────

const RADIUS_ARBITRARY_RE = new RegExp(
  `${B}rounded${CORNER}-\\[(?!var\\(|inherit\\])[^\\]]+\\]`,
  "g",
);
const RADIUS_LEGACY_RE = new RegExp(
  `${B}rounded${CORNER}-(?:sm|md|lg|xl|2xl|3xl)(?![\\w-])`,
  "g",
);
const BORDER_LEGACY_RE = new RegExp(
  `${B}(?:border(?:-[trblxyse])?|divide)-border(?![\\w-])`,
  "g",
);
const BORDER_MID_RE = new RegExp(
  `${B}border(?:-[trblxyse])?-(?:border-mid|\\(--border-mid\\)|\\[var\\(--border-mid\\)\\])`,
  "g",
);
const BORDER_HEAVY_RE = new RegExp(
  `${B}border(?:-[trblxyse])?-(?:2|4|8|\\[\\d[^\\]]*\\])(?![\\w-])`,
  "g",
);
const SHADOW_ARBITRARY_RE = new RegExp(
  `${B}(?:drop-)?shadow-\\[(?!var\\()[^\\]]+\\]`,
  "g",
);

/** The tag that owns `idx` on line `lineIdx`, looking back a few lines. */
function owningTag(
  codeLines: readonly string[],
  lineIdx: number,
  idx: number,
): string | null {
  const tagRe = /<([A-Za-z][\w.]*)/g;
  for (let l = lineIdx; l >= 0 && l >= lineIdx - 8; l--) {
    const text = l === lineIdx ? codeLines[l].slice(0, idx) : codeLines[l];
    let last: string | null = null;
    tagRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(text)) !== null) last = m[1];
    if (last) return last;
  }
  return null;
}

const CONTROL_TAG = /^(?:button|input|select|textarea|label)$|button|checkbox|radio|switch|toggle|input|select/i;

// ─── motion ────────────────────────────────────────────────────────────────

const DURATION_CLASS_RE = new RegExp(
  // A bracket that reads a variable (duration-[var(--dur-state)]) is a token reference, not a literal.
  `${B}(?:duration|delay)-(?:[1-9]\\d*|\\[(?!var\\()[^\\]]+\\])(?![\\w-])`,
  "g",
);
const DURATION_STYLE_RE =
  /\b(?:transition|animation)(?:Duration|Delay)?\s*:\s*["'`][^"'`]*?(?<![\w-])\d*\.?\d+m?s\b/g;
const DURATION_CSS_RE =
  /(?<![\w-])(?:transition|animation)(?:-duration|-delay)?\s*:[^;{}]*?(?<![\w-])\d*\.?\d+m?s\b/g;
const EASE_CLASS_RE = new RegExp(
  `${B}ease-(?:in|out|in-out|\\[[^\\]]+\\])(?![\\w-])`,
  "g",
);
const CUBIC_BEZIER_RE = /(?<![\w-])cubic-bezier\(/g;
const GSAP_EASE_RE =
  /\bease\s*:\s*["'`](?:power\d|expo|sine|circ|back|elastic|bounce|quad|cubic|quart|quint|strong|linear|steps)[\w.()]*["'`]/g;
const FRAMER_RE =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:framer-motion|motion|motion\/react|motion\/react-client|motion\/mini)["']/g;

// ─── typography ────────────────────────────────────────────────────────────

const FONT_ARBITRARY_RE = new RegExp(`${B}font-\\[[^\\]]+\\]`, "g");
const FONT_STYLE_RE = /\bfontFamily\s*:\s*["'`](?!var\()/g;
const FONT_CSS_RE =
  /(?<![\w-])font-family\s*:(?!\s*(?:var\(|inherit|initial|unset|revert))/g;
const FONT_SERIF_RE = new RegExp(`${B}font-serif(?![\\w-])`, "g");
const HEADING_CLAMP_RE = new RegExp(`${B}text-\\[clamp\\([^\\]]*\\]`, "g");
const ARABIC_INDIC_RE = /[٠-٩۰-۹]+/g;
const INTL_AR_RE =
  /(?:toLocale\w*String|Intl\.\w+|NumberFormat|DateTimeFormat)\s*\(\s*["'`]ar(?:-[A-Za-z]{2})?["'`]/g;

// ─── RTL ───────────────────────────────────────────────────────────────────

const TW_VALUE =
  "(?:\\d+(?:\\.\\d+)?(?:\\/\\d+)?|px|full|auto|\\[[^\\]\\s]+\\]|\\(--[\\w-]+\\))";
const RTL_CLASS_RE = new RegExp(
  `${B}-?(?:` +
    `(?:m[lr]|p[lr]|scroll-m[lr]|scroll-p[lr]|left|right)-${TW_VALUE}` +
    `|text-(?:left|right)|float-(?:left|right)|clear-(?:left|right)` +
    `|rounded-(?:l|r|tl|tr|bl|br)(?:-(?:none|sm|md|lg|xl|2xl|3xl|full|\\[[^\\]\\s]+\\]|ctl[\\w-]*|panel[\\w-]*))?` +
    `|border-[lr](?:-(?:\\d+|\\[[^\\]\\s]+\\]|[a-z][\\w-]*(?:\\/\\d+)?))?` +
    `)(?![\\w-])`,
  "g",
);
const RTL_STYLE_RE =
  /\b(?:marginLeft|marginRight|paddingLeft|paddingRight|borderLeft\w*|borderRight\w*)\s*:|\btextAlign\s*:\s*["'](?:left|right)["']/g;

/** `left-0 right-0`, `ml-4 mr-4` and `left-1/2 -translate-x-1/2` are direction-neutral. */
function isSymmetric(code: string, match: string): boolean {
  const m = /^(-?)(m|p|scroll-m|scroll-p|left|right)(l|r)?-(.+)$/.exec(match);
  if (!m) return false;
  const [, neg, base, side, value] = m;
  if (base === "left" || base === "right") {
    if (value === "1/2" && /-translate-x-1\/2/.test(code)) return true;
    const other = base === "left" ? "right" : "left";
    return new RegExp(`${B}${neg}${other}-${escapeRe(value)}(?![\\w-])`).test(code);
  }
  if (!side) return false;
  const otherSide = side === "l" ? "r" : "l";
  return new RegExp(`${B}${neg}${base}${otherSide}-${escapeRe(value)}(?![\\w-])`).test(code);
}

/** `rtl:text-right` / `ltr:pl-4` already know their direction. */
function directionScoped(code: string, idx: number): boolean {
  let start = idx;
  while (start > 0 && !/[\s"'`{(,]/.test(code[start - 1])) start -= 1;
  const prefix = code.slice(start, idx);
  // rtl:/ltr: variants, or a variant keyed on a physical side (data-[vaul-drawer-direction=right]:).
  return /(?:^|:)(?:rtl|ltr):/.test(prefix) || /(?:left|right)\]:/.test(prefix);
}

/** `{ paddingLeft: 0, paddingRight: 0 }` sets both sides alike. */
function isSymmetricStyle(code: string, match: string): boolean {
  const m = /^(margin|padding|border)(Left|Right)/.exec(match);
  if (!m) return false;
  const other = m[2] === "Left" ? "Right" : "Left";
  return new RegExp(`\\b${m[1]}${other}\\s*:`).test(code);
}

/** True when any layer of `shadow-[…]` has a non-zero blur radius (an elevation, not an edge). */
function hasBlurredLayer(token: string): boolean {
  const body = token.slice(token.indexOf("[") + 1, -1);
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "(") depth += 1;
    else if (body[i] === ")") depth -= 1;
    else if (body[i] === "," && depth === 0) {
      layers.push(body.slice(start, i));
      start = i + 1;
    }
  }
  layers.push(body.slice(start));
  return layers.some((layer) => {
    const lengths = layer.split("_").filter((p) => /^-?[\d.]+(?:px|rem|em)?$/.test(p));
    // An unparseable layer (a var(), a keyword) is treated as an elevation.
    if (lengths.length < 2) return !/^(?:none|inherit|initial|unset)$/.test(layer.trim());
    return lengths.length >= 3 && parseFloat(lengths[2]) !== 0;
  });
}

/** A line that lists all ten digits of one script is a conversion table. */
function isDigitTable(code: string): boolean {
  return [/[٠-٩]/g, /[۰-۹]/g].some((re) => new Set(code.match(re) ?? []).size === 10);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

// ─── hierarchy ─────────────────────────────────────────────────────────────

interface Heading {
  level: number;
  line: number;
  index: number;
  match: string;
}

function headings(ctx: FileContext): Heading[] {
  const out: Heading[] = [];
  const tagRe = /<h([1-6])(?=[\s>/])/g;
  ctx.codeLines.forEach((text, line) => {
    tagRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(text)) !== null) {
      out.push({ level: Number(m[1]), line, index: m.index, match: m[0] });
    }
    if (ctx.ext === "mdx") {
      const md = /^(#{1,6})\s+\S/.exec(text);
      if (md) out.push({ level: md[1].length, line, index: 0, match: md[1] });
    }
  });
  return out;
}

// ─── the rules ─────────────────────────────────────────────────────────────

export const RULE_CHECKS: RuleCheck[] = [
  {
    rule: {
      id: "color-hex-literal",
      category: "color",
      severity: "error",
      title: "Hex colour literal",
      why: "C9: every colour routes through the token chain and components never touch raw hex; tokens.css is the only colour source (one palette).",
      fix: "Use a semantic token utility (bg-background, text-foreground, bg-brand, text-muted-foreground…) or, outside CSS, import the value from @repo/ui/palette.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "ts", "css", "mdx"],
    line: ({ code }) =>
      hits(HEX_RE, code, (m) => {
        if (insideBrackets(code, m.index)) return false;
        // "#123" in prose is an issue number, not a colour; a colour needs a value context.
        if (/^#\d+$/.test(m[0])) {
          const prev = code[m.index - 1] ?? "";
          return /["'`(:,=]/.test(prev);
        }
        return true;
      }),
  },
  {
    rule: {
      id: "color-function-literal",
      category: "color",
      severity: "error",
      title: "Raw rgb()/hsl()/oklch() colour",
      why: "C9: a colour function with literal channels bypasses the primitive → semantic → system chain; hsl(var(--token) / α) is the allowed form.",
      fix: "Write hsl(var(--token) / α) or use the token utility with an opacity modifier (bg-foreground/10).",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "ts", "css", "mdx"],
    line: ({ code }) =>
      hits(COLOR_FN_RE, code, (m) => !insideBrackets(code, m.index)),
  },
  {
    rule: {
      id: "color-arbitrary-value",
      category: "color",
      severity: "error",
      title: "Arbitrary colour value in a class",
      why: "C9 and the one-palette rule: bg-[#…] / text-[hsl(…)] invents a colour outside tokens.css.",
      fix: "Use the matching token utility (bg-brand, text-foreground, border-border-subtle…), adding a token to tokens.css first if none fits.",
      source: SRC_TOKENS,
      apps: ALL,
    },
    exts: ["tsx", "ts", "css", "mdx"],
    line: ({ code }) => hits(COLOR_ARBITRARY_RE, code),
  },
  {
    rule: {
      id: "color-tailwind-palette",
      category: "color",
      severity: "error",
      title: "Tailwind default palette colour",
      why: "C9: Tailwind's slate/gray/red-NNN ramps are not Altruvex primitives; tokens.css defines the only palette both apps share.",
      fix: "Use the semantic token (text-muted-foreground, bg-surface, text-success/warning/error, bg-brand) instead of a ramp step.",
      source: SRC_TOKENS,
      apps: ALL,
    },
    exts: ["tsx", "ts", "css", "mdx"],
    line: ({ code }) => hits(TW_PALETTE_RE, code),
  },
  {
    rule: {
      id: "color-pure-black",
      category: "color",
      severity: "warn",
      title: "Solid black utility",
      why: "C7: screens use near-black ink (--n-8), never pure #000; a translucent black/NN photo scrim is fine.",
      fix: "Use bg-foreground / text-foreground or the inverted-scene background token; keep black only as a black/NN scrim over photos.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    line: ({ code }) => hits(PURE_BLACK_RE, code),
  },
  {
    rule: {
      id: "radius-arbitrary",
      category: "radius",
      severity: "error",
      title: "Arbitrary radius",
      why: "Edge system D4/E4: every radius is a ctl-* (by height) or panel-* (by role) token; arbitrary [0.3rem]/[2px] values were absorbed into ctl-xs.",
      fix: "Use rounded-ctl-xs (≤24px), rounded-ctl-sm/ctl/ctl-lg by height, rounded-panel-sm/md/lg by role, or rounded-full for pills.",
      source: SRC_EDGE,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    line: ({ code }) => hits(RADIUS_ARBITRARY_RE, code),
  },
  {
    rule: {
      id: "radius-legacy-scale",
      category: "radius",
      severity: "error",
      title: "Legacy rounded-sm/md/lg/xl scale",
      why: "Edge system D4 and the one-system decision (2026-10-03): both apps take ctl-* by measured height and panel-* by role; the legacy rounded-sm/md/lg/xl/2xl/3xl scale is retired.",
      fix: "Measure the element: ≤24px → rounded-ctl-xs, controls → rounded-ctl-sm/ctl/ctl-lg, containers → rounded-panel-sm/md/lg, pills → rounded-full.",
      source: SRC_EDGE,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    line: ({ code }) => hits(RADIUS_LEGACY_RE, code),
  },
  {
    rule: {
      id: "border-legacy-token",
      category: "border",
      severity: "warn",
      title: "border-border instead of border-border-subtle",
      why: "Edge system D5/D8, in both apps (2026-10-03): resting hairlines resolve to --border-subtle; only semantic status cards keep tinted edges.",
      fix: "Use border-border-subtle (divide-border-subtle for dividers).",
      source: SRC_EDGE,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    line: ({ code }) => hits(BORDER_LEGACY_RE, code),
  },
  {
    rule: {
      id: "border-mid-control",
      category: "border",
      severity: "warn",
      title: "border-mid as a control's edge",
      why: "C12/A1: --border-mid measures 1.5:1 in light mode, below the 3:1 floor for a control's only visible boundary.",
      fix: "Use border-foreground/45 (hover /70) for a radio, checkbox, input or outlined button edge; keep border-mid for decorative dividers.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "ts"],
    line: ({ code, codeLines, index }) =>
      hits(BORDER_MID_RE, code, (m) => {
        const tag = owningTag(codeLines, index, m.index);
        return tag !== null && CONTROL_TAG.test(tag);
      }),
  },
  {
    rule: {
      id: "border-heavy-rule",
      category: "border",
      severity: "info",
      title: "Heavy border outside the ledger-head-rule",
      why: "Edge system D1: border-t-2 border-foreground is valid only as the rule that opens a ledger; 2px strokes otherwise belong to diagrams/glyphs or a radio's state.",
      fix: "Use a 1px border-border-subtle edge, or confirm this is a ledger head, diagram stroke or selection state and mark it brand-allow.",
      source: SRC_EDGE,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    line: ({ code }) =>
      hits(
        BORDER_HEAVY_RE,
        code,
        (m) =>
          // D1 ledger-head-rule, and D7's logical accent side rule (border-s-2 / border-e-2).
          !(m[0] === "border-t-2" && /(?<![\w-])border-foreground(?![\w/-])/.test(code)) &&
          m[0] !== "border-s-2" &&
          m[0] !== "border-e-2" &&
          // A tab's selected underline overlaps the bar's hairline by -mb-px: a selection state, not a rule.
          !(m[0] === "border-b-2" && /(?<![\w-])-mb-px(?![\w-])/.test(code)),
      ),
  },
  {
    rule: {
      id: "shadow-arbitrary",
      category: "border",
      severity: "warn",
      title: "Arbitrary shadow",
      why: "CI9: elevation is edges first plus a few two-layer shadow levels; a one-off blurred shadow-[…] adds an untracked level.",
      fix: "Use shadow-card / shadow-card-lg or a glass shadow token (--glass-shadow); add a level to the tokens if one is missing.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    // A zero-blur shadow is a drawn edge (underline, inset ring, autofill mask), not an elevation level.
    line: ({ code }) => hits(SHADOW_ARBITRARY_RE, code, (m) => hasBlurredLayer(m[0])),
  },
  {
    rule: {
      id: "motion-duration-literal",
      category: "motion",
      severity: "error",
      title: "Duration/delay literal",
      why: "MOTION.md §0: every duration comes from MOTION; CSS reads it through --motion-* (never duration-300); the only allowed literals live inside scrubbed timelines.",
      fix: "Use duration-(--motion-hover|instant|drawer|fast|base|display) in classes, var(--motion-*) in CSS, MOTION.duration.* in TS. Admin: duration-(--dur-state|--dur-panel).",
      source: SRC_MOTION,
      apps: ALL,
    },
    exts: ["tsx", "ts", "css", "mdx"],
    skipFile: (file) => inMotionLib(file),
    line: ({ code, ext }) =>
      ext === "css"
        ? hits(DURATION_CSS_RE, code)
        : [...hits(DURATION_CLASS_RE, code), ...hits(DURATION_STYLE_RE, code)],
  },
  {
    rule: {
      id: "motion-ease-literal",
      category: "motion",
      severity: "error",
      title: "Easing literal",
      why: "MOTION.md §2 and M1: eases come from MOTION/--ease-*; a hand-written cubic-bezier silently runs linear in GSAP, and ease-in/out bypass the scale.",
      fix: "Use ease-default|smooth|strong in classes, var(--ease-*) in CSS, MOTION.ease.* in TS.",
      source: SRC_MOTION,
      apps: ALL,
    },
    exts: ["tsx", "ts", "css", "mdx"],
    skipFile: (file) => inMotionLib(file),
    line: ({ code, ext }) =>
      ext === "css"
        ? hits(CUBIC_BEZIER_RE, code)
        : [...hits(EASE_CLASS_RE, code), ...hits(CUBIC_BEZIER_RE, code, (m) => !insideBrackets(code, m.index))],
  },
  {
    rule: {
      id: "motion-gsap-ease-string",
      category: "motion",
      severity: "warn",
      title: "GSAP ease name outside lib/motion",
      why: "MOTION.md §0: a section may call GSAP, but never with a literal it could take from MOTION (ease: \"none\" for scrub is allowed).",
      fix: "Pass MOTION.ease.* (registered as a CustomEase) or a preset from lib/motion.",
      source: SRC_MOTION,
      apps: ALL,
    },
    exts: ["tsx", "ts"],
    skipFile: (file) => inMotionLib(file),
    line: ({ code }) => hits(GSAP_EASE_RE, code),
  },
  {
    rule: {
      id: "motion-framer-import",
      category: "motion",
      severity: "error",
      title: "Framer Motion import",
      why: "MOTION.md: the motion stack is GSAP + Lenis + the in-house spring — no Framer.",
      fix: "Use the lib/motion hooks and presets (useReveal, useSection*, motion.* presets, springs).",
      source: SRC_MOTION,
      apps: ALL,
    },
    exts: ["tsx", "ts"],
    line: ({ code }) => hits(FRAMER_RE, code),
  },
  {
    rule: {
      id: "type-font-family-literal",
      category: "typography",
      severity: "error",
      title: "Font family literal",
      why: "One font: all text in www and admin is Altruvex Sans via --font-brand; no second web font or monospace is loaded.",
      fix: "Use font-sans (or var(--font-brand)); the Georgia emphasis comes only from <Highlight>.",
      source: SRC_GLOBALS,
      apps: ALL,
    },
    exts: ["tsx", "ts", "css", "mdx"],
    skipFile: (file) => isImageGenerator(file),
    line: ({ code, ext }) =>
      ext === "css"
        ? hits(FONT_CSS_RE, code)
        : [...hits(FONT_ARBITRARY_RE, code), ...hits(FONT_STYLE_RE, code)],
  },
  {
    rule: {
      id: "type-font-serif",
      category: "typography",
      severity: "warn",
      title: "font-serif outside the emphasis component",
      why: "The only serif is the Georgia italic emphasis clause owned by Highlight (section-heading-emphasis); body copy never takes italic.",
      fix: "Wrap the clause in <Highlight> from @repo/ui/www, or keep the text in the brand face.",
      source: "docs/section-heading-emphasis.md",
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    skipFile: (file) => file === EMPHASIS_FILE,
    line: ({ code }) => hits(FONT_SERIF_RE, code),
  },
  {
    rule: {
      id: "type-heading-own-scale",
      category: "typography",
      severity: "info",
      title: "Heading sets its own fluid size",
      why: "T3/T4: section headings take the shared scale (.section-title / SectionHeading); a heading with its own clamp() drifts from its neighbours.",
      fix: "Use SectionHeading or .section-title/.display; keep text-[clamp()] for display numerals and art, not headings.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "mdx"],
    line: ({ code, codeLines, index }) =>
      hits(HEADING_CLAMP_RE, code, (m) => /^h[1-6]$/.test(owningTag(codeLines, index, m.index) ?? "")),
  },
  {
    rule: {
      id: "type-arbitrary-size",
      category: "typography",
      severity: "warn",
      title: "Fixed text size outside the scale",
      why: "T3 + sweep phase 4 (2026-10-05): fixed sizes take a step — text-micro, meta, md, base, body, lg, xl… Off-scale sizes snapped: 15px → base, 13px → md, 17px → body, 9–11px → micro; headings to the nearest step.",
      fix: "Use the nearest type step (body and label text round up, so legibility never drops). Relative em, vw and clamp() sizes are not this rule's concern.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    // MagneticButton is never touched (Ali); its 15px label is a known exception, wherever its class maps live.
    skipFile: (file) => /(?:\/magnetic-button\.tsx|packages\/ui\/src\/www\/button\.ts)$/.test(file),
    line: ({ code }) => hits(ARBITRARY_TEXT_SIZE_RE, code),
  },
  {
    rule: {
      id: "type-arabic-indic-digits",
      category: "typography",
      severity: "warn",
      title: "Arabic-Indic digits or an 'ar' number locale",
      why: "Latin digits rule (2026-10-04): every Arabic figure is set in Latin 0-9; Intl formatters use ar-EG-u-nu-latn.",
      fix: "Type Latin digits, use localizeNumbers / <Num>, and pass the ar-EG-u-nu-latn locale to Intl.",
      source: SRC_ARCH,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    skipFile: (file) => /\/multilingual-architecture\.mdx$/.test(file),
    line: ({ code }) => [
      // A character class ([٠-٩]) or a full digit table is an input normalizer, which may accept them.
      ...hits(
        ARABIC_INDIC_RE,
        code,
        () => !/[٠۰]\s*-\s*[٩۹]/.test(code) && !isDigitTable(code),
      ),
      ...hits(INTL_AR_RE, code),
    ],
  },
  {
    rule: {
      id: "rtl-physical-property",
      category: "rtl",
      severity: "error",
      title: "Physical direction instead of logical",
      why: "A7/T7: RTL is first-class, so direction uses logical properties; physical left/right flips the layout wrong in Arabic.",
      fix: "Use ms-/me-, ps-/pe-, start-/end-, text-start/text-end, rounded-s/e, border-s/e (marginInlineStart etc. in style objects).",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "ts", "mdx"],
    // Admin and the ui components it renders are held to logical properties too (Ali, 2026-10-05).
    // OG/icon generators render a fixed LTR bitmap through Satori, not the page.
    skipFile: (file) => isImageGenerator(file),
    line: ({ code }) => [
      ...hits(
        RTL_CLASS_RE,
        code,
        (m) =>
          !isSymmetric(code, m[0]) &&
          !directionScoped(code, m.index) &&
          // A pointer-events-none layer pinned at left-0 is a JS-positioned origin (pointer follower).
          !(m[0] === "left-0" && /(?<![\w-])pointer-events-none(?![\w-])/.test(code)),
      ),
      ...hits(RTL_STYLE_RE, code, (m) => !isSymmetricStyle(code, m[0])),
    ],
  },
  {
    rule: {
      id: "image-raw-img",
      category: "image",
      severity: "info",
      title: "Raw <img> instead of next/image",
      why: "Site media is rendered with next/image (the first-paint media arrival in MOTION.md is written against <Image>), which also sizes it, serves modern formats and lazy-loads.",
      fix: "Use next/image (<Image>) with width/height or fill + sizes.",
      source: SRC_MOTION,
      apps: ALL,
    },
    exts: ["tsx", "mdx"],
    skipFile: (file) => isImageGenerator(file),
    line: ({ code }) => hits(/<img(?=[\s>/])/g, code),
  },
  {
    rule: {
      id: "hierarchy-multiple-h1",
      category: "hierarchy",
      severity: "info",
      title: "More than one <h1> in a file",
      why: "T4/A5: heading levels declare scope and a page has exactly one H1.",
      fix: "Keep one h1 for the page title; demote the others to h2/h3 and style them with classes.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "mdx"],
    file: (ctx) => {
      const h1s = headings(ctx).filter((h) => h.level === 1);
      return h1s.slice(1).map((h) => ({ line: h.line, index: h.index, match: h.match }));
    },
  },
  {
    rule: {
      id: "hierarchy-skipped-level",
      category: "hierarchy",
      severity: "info",
      title: "Skipped heading level",
      why: "T4: never skip a heading level or pick one for its looks (H1 page, H2 section, H3 block, H4 detail).",
      fix: "Use the next level down (or SectionHeading's `as`), and size it with a class.",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx", "mdx"],
    file: (ctx) => {
      const out: FileHit[] = [];
      let prev = 0;
      for (const h of headings(ctx)) {
        if (prev > 0 && h.level > prev + 1) {
          out.push({ line: h.line, index: h.index, match: `${h.match} after h${prev}` });
        }
        prev = h.level;
      }
      return out;
    },
  },
  {
    rule: {
      id: "logo-hand-rolled",
      category: "logo",
      severity: "info",
      title: "Hand-set \"Altruvex\" wordmark",
      why: "S9 and reuse-existing-components: the mark lives in packages/ui altruvex-logo.tsx (and the fitted footer wordmark); a typed name drifts from it.",
      fix: "Render <AltruvexLogo> from @repo/ui (variant full, icon or lockup). Plain prose mentions are fine (add brand-allow).",
      source: SRC_PRINCIPLES,
      apps: ALL,
    },
    exts: ["tsx"],
    skipFile: (file) => file === LOGO_FILE || file === FOOTER_FILE,
    line: ({ code }) => {
      const inline = hits(/>\s*(?:Altruvex|ALTRUVEX)\s*</g, code).map((h) => ({
        index: h.index + h.match.search(/A/),
        match: h.match.replace(/[<>\s]/g, ""),
      }));
      const own = /^\s*(Altruvex|ALTRUVEX)\s*$/.exec(code);
      if (own) inline.push({ index: code.indexOf(own[1]), match: own[1] });
      return inline;
    },
  },
  {
    rule: {
      id: "ui-mirror-copy",
      category: "reuse",
      severity: "error",
      title: "Shared component redefined in an app",
      why: "One source: a piece @repo/ui (or @repo/ui/www) exports exists once in packages/ui; an app copy forks it, so a redesign no longer reaches every app.",
      fix: "Delete the copy and import the name from @repo/ui or @repo/ui/www; a dialect difference is a `variant` on the shared file, app-only behaviour is a wrapper that imports the shared name.",
      source: SRC_BRIEF,
      apps: REUSE_APPS,
    },
    exts: ["tsx", "ts"],
    skipFile: (file) => !inAppComponents(file),
    file: ({ repoRoot, codeLines }) => {
      const shared = sharedExportNames(repoRoot);
      const imported = importedFromUi(codeLines);
      const out: FileHit[] = [];
      codeLines.forEach((text, line) => {
        for (const m of text.matchAll(EXPORT_DECL_RE)) {
          const name = m[1];
          if (!shared.has(name) || imported.has(name)) continue;
          out.push({ line, index: (m.index ?? 0) + m[0].length - name.length, match: name });
        }
      });
      return out;
    },
  },
  {
    rule: {
      id: "ui-mirror-comment",
      category: "reuse",
      severity: "error",
      title: "Comment admits a copy of shared code",
      why: "One source: \"Mirrors …\" / \"keep it in step\" means two copies that must be edited together, and one will be forgotten.",
      fix: "Make one the source: import it from @repo/ui, or move the shared part into packages/ui and wrap it.",
      source: SRC_BRIEF,
      apps: REUSE_APPS,
    },
    exts: ["tsx", "ts", "css"],
    skipFile: isAuditSource,
    file: ({ codeLines, rawLines }) => {
      const out: FileHit[] = [];
      rawLines.forEach((raw, line) => {
        // only inside a comment: masked in the code line, present in the raw one
        for (const h of hits(MIRROR_COMMENT_RE, raw, (m) => codeLines[line][m.index] === " " && raw[m.index] !== " ")) {
          out.push({ line, ...h });
        }
      });
      return out;
    },
  },
  {
    rule: {
      id: "ui-primitive-import",
      category: "reuse",
      severity: "error",
      title: "Primitive library imported in an app",
      why: "One source: Radix, vaul, cmdk and react-day-picker are wrapped once in @repo/ui; an app that imports them directly builds its own copy of the control.",
      fix: "Import the wrapper from @repo/ui (or @repo/ui/www); if none exists, add it to packages/ui. cmdk is allowed only in a file that also uses menuSurface/menuItem; @radix-ui/react-slot is always allowed.",
      source: SRC_BRIEF,
      apps: REUSE_APPS,
    },
    exts: ["tsx", "ts"],
    skipFile: isAuditSource,
    file: ({ codeLines }) => {
      const whole = codeLines.join("\n");
      const out: FileHit[] = [];
      codeLines.forEach((text, line) => {
        for (const m of text.matchAll(PRIMITIVE_IMPORT_RE)) {
          const mod = m[1];
          if (!PRIMITIVE_MODULE_RE.test(mod.split("/").slice(0, mod.startsWith("@") ? 2 : 1).join("/"))) continue;
          const ok = PRIMITIVE_IMPORT_EXCEPTIONS.some(
            (e) => e.module === mod && (!e.onlyIf || e.onlyIf.test(whole)),
          );
          if (!ok) out.push({ line, index: (m.index ?? 0) + m[0].indexOf(mod), match: mod });
        }
      });
      return out;
    },
  },
  {
    rule: {
      id: "ui-hand-built-modal",
      category: "reuse",
      severity: "error",
      title: "Hand-built modal in an app",
      why: "One source: focus trap, scroll lock, Escape and aria-modal are done once by the shared Dialog/Sheet/Drawer in packages/ui; a hand-built one skips some of them.",
      fix: "Use the shared overlay from @repo/ui (Dialog, AlertDialog, Sheet, Drawer, Popover); add a variant there if the look differs.",
      source: SRC_BRIEF,
      apps: REUSE_APPS,
    },
    exts: ["tsx", "ts"],
    skipFile: isAuditSource,
    // createPortal alone is not a modal (admin's floating selection dock uses one).
    line: ({ code }) => hits(/\baria-modal\b|role=["']dialog["']/g, code),
  },
];

export const RULES: Rule[] = RULE_CHECKS.map((c) => c.rule);
