import "server-only";
import { contextLabel, identityDecls, tokenDecls, tokenKind } from "./css-source";
import { editorHref } from "./repo";
import type { DeclView } from "@/components/swatch";

export interface ColorToken {
  name: string;
  kind: "channels" | "color";
  decls: DeclView[];
}

export interface TokenGroup {
  id: string;
  title: string;
  note: string;
  tokens: ColorToken[];
}

/** Scene contexts only — world classes and named gradients are shown on their own. */
function isSceneContext(context: string[]): boolean {
  const last = context[context.length - 1] ?? "";
  return context[0] !== "@theme inline" && !/\.accent-|\.body-accent|#home|\.photo-|header\[data-over/.test(last);
}

export function declViews(name: string, filter: (context: string[]) => boolean = isSceneContext): DeclView[] {
  return (tokenDecls().get(name) ?? [])
    .filter((d) => filter(d.context))
    .map((d) => ({
      context: contextLabel(d.context),
      value: d.value,
      where: `${d.file.split("/").pop()}:${d.line}`,
      href: editorHref(d.file, d.line),
    }));
}

const GROUPS: { id: string; title: string; note: string; match: (n: string) => boolean }[] = [
  {
    id: "neutrals",
    title: "Neutral scale",
    note: "Nine zero-saturation steps. Every surface, text and border token resolves to one of these.",
    match: (n) => /^--n-\d$/.test(n),
  },
  {
    id: "brand",
    title: "Brand blue",
    note: "One brand hue. --brand fills; --brand-text is the mode- and scene-aware text variant.",
    match: (n) => n.startsWith("--brand") || n === "--selection-accent" || n === "--accent" || n === "--ring",
  },
  {
    id: "surfaces",
    title: "Surfaces & text",
    note: "Semantic roles. Components use these names, never a neutral step directly.",
    match: (n) =>
      [
        "--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground",
        "--surface", "--surface-2", "--primary", "--primary-foreground", "--secondary", "--secondary-foreground",
        "--muted", "--muted-foreground", "--subtle-foreground", "--read-dim", "--inverted-bg", "--input",
        "--accent-foreground",
      ].includes(n),
  },
  {
    id: "ladder",
    title: "Text ladder",
    note: "Alpha steps of the foreground ink: high → mid → low → muted, plus the surface and border tints.",
    match: (n) => n.startsWith("--s-"),
  },
  {
    id: "borders",
    title: "Border strength",
    note: "--border-subtle is the container edge. --border-mid is ~1.5:1 and is never a control's only edge.",
    match: (n) => /^--border(-|$)/.test(n),
  },
  {
    id: "glass",
    title: "Glass",
    note: "The fills, edges and sheens behind the liquid-glass surfaces. Glass sits on a layer, never on text.",
    match: (n) => n.startsWith("--glass-") && !/blur|shadow|filter/.test(n),
  },
  {
    id: "status",
    title: "Status",
    note: "State colours. They mark state, never decoration.",
    match: (n) =>
      ["--success", "--warning", "--danger", "--info", "--neutral", "--progress", "--messaging-whatsapp", "--destructive-foreground"].includes(n),
  },
  {
    id: "charts",
    title: "Chart series",
    note: "Six series hues for data, admin dashboards first.",
    match: (n) => n.startsWith("--chart-"),
  },
];

const NOT_COLOUR = /^--(radius|motion|duration|dur-|ease|control-h|track|word-caps|lh-|weight|text-|leading|section|heading|font|animate|default-transition|elev|elevation|shadow|glass-blur|glass-.*(filter|shadow)|read-ink|color-|tw-|grad-|local-accent|m-|spacing)/;

export function colorGroups(): TokenGroup[] {
  const names = [...tokenDecls().keys()].filter((n) => declViews(n).length > 0);
  const used = new Set<string>();
  const groups: TokenGroup[] = GROUPS.map((g) => {
    const tokens = names.filter(g.match).map((name) => {
      used.add(name);
      return { name, kind: tokenKind(name), decls: declViews(name) };
    });
    return { id: g.id, title: g.title, note: g.note, tokens };
  });
  const rest = names.filter((n) => !used.has(n) && !NOT_COLOUR.test(n));
  if (rest.length > 0) {
    groups.push({
      id: "unclassified",
      title: "Unclassified",
      note: "Colour-like tokens no group above claims. A new token lands here first — give it a role or remove it.",
      tokens: rest.map((name) => ({ name, kind: tokenKind(name), decls: declViews(name) })),
    });
  }
  return groups;
}

/** Classes that set a gradient (--grad-from) — worlds and named accents — in source order. */
export function gradientClasses(): { name: string; worlds: boolean }[] {
  const seen = new Map<string, boolean>();
  for (const d of identityDecls()) {
    if (d.property !== "--grad-from") continue;
    const sel = d.context[d.context.length - 1] ?? "";
    for (const m of sel.matchAll(/\.(accent-[a-z-]+|body-accent)/g)) {
      if (!seen.has(m[1])) seen.set(m[1], m[1].startsWith("accent-world-"));
    }
  }
  return [...seen].map(([name, worlds]) => ({ name, worlds }));
}

/** Every `--x` declared under a given selector, e.g. the motion durations in :root. */
export function tokensMatching(pattern: RegExp): { name: string; value: string; file: string; line: number; context: string }[] {
  const out: { name: string; value: string; file: string; line: number; context: string }[] = [];
  const seen = new Set<string>();
  for (const d of identityDecls()) {
    if (!pattern.test(d.property)) continue;
    const key = d.property + "|" + contextLabel(d.context);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: d.property, value: d.value, file: d.file, line: d.line, context: contextLabel(d.context) });
  }
  return out;
}
