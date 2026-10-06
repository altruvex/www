import { LOCALE_META, scriptHasCase, toLocale, type Locale } from "@/i18n/locale-meta";
import { SITE_CONFIG } from "@/lib/metadata";
import { ImageResponse } from "next/og";
import { css, PALETTE } from "@repo/ui/palette";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Altruvex social preview";
export const contentType = "image/png";
export const size = {
  height: 630,
  width: 1200,
};

export const revalidate = 86400;

const BRAND_OG = join(process.cwd(), "node_modules/@repo/brand-font/dist/og");

function loadBrandFont(face: "Latin" | "Arabic", weight: 400 | 700) {
  return readFile(join(BRAND_OG, `AltruvexSans${face}-${weight}.ttf`));
}

/** The card's copy, per locale. A new locale must add its row. */
const OG_COPY: Record<
  Locale,
  { eyebrow: string; heading: string; sub: string }
> = {
  en: {
    eyebrow: "WEB ENGINEERING STUDIO",
    heading: "Custom websites and web apps.",
    sub: "Architecture-first builds. Performance by default. Direct engineering access.",
  },
  ar: {
    eyebrow: "استوديو تطوير ويب",
    heading: "مواقع وتطبيقات ويب مخصصة.",
    sub: "المعمارية أولاً. الأداء من البداية. تواصل مباشر مع الهندسة.",
  },
};

type Run = { kind: "A" | "L" | "P"; text: string };

const MIRRORED: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "«": "»",
  "»": "«",
};

function strongClass(ch: string, previous: "L" | "R" | "N"): "L" | "R" | "N" {
  if (/[\p{Script=Latin}\p{N}]/u.test(ch)) return "L";
  if (/[\p{Script=Arabic}\u0640]/u.test(ch)) return "R";
  if (/\p{M}/u.test(ch)) return previous;
  return "N";
}

function rtlWords(text: string): Run[][] {
  const chars = Array.from(text);
  const raw: ("L" | "R" | "N")[] = [];
  for (const ch of chars) {
    raw.push(strongClass(ch, raw[raw.length - 1] ?? "N"));
  }
  const resolved = raw.map((c, i) => {
    if (c !== "N") return c;
    let before: "L" | "R" = "R";
    for (let j = i - 1; j >= 0; j--) {
      if (raw[j] !== "N") {
        before = raw[j] as "L" | "R";
        break;
      }
    }
    let after: "L" | "R" = "R";
    for (let j = i + 1; j < raw.length; j++) {
      if (raw[j] !== "N") {
        after = raw[j] as "L" | "R";
        break;
      }
    }
    return before === "L" && after === "L" ? "L" : "R";
  });

  const words: Run[][] = [];
  let word: Run[] = [];
  chars.forEach((ch, i) => {
    if (resolved[i] === "R" && raw[i] === "N" && /\s/.test(ch)) {
      if (word.length) words.push(word);
      word = [];
      return;
    }
    const kind = resolved[i] === "L" ? "L" : raw[i] === "R" ? "A" : "P";
    const last = word[word.length - 1];
    if (last?.kind === kind) {
      last.text =
        kind === "P" ? (MIRRORED[ch] ?? ch) + last.text : last.text + ch;
    } else {
      word.push({ kind, text: kind === "P" ? (MIRRORED[ch] ?? ch) : ch });
    }
  });
  if (word.length) words.push(word);
  return words;
}

type Forms = { fin?: string; iso: string; ini?: string; med?: string };
const ARABIC_FORMS = new Map<string, Forms>();
for (let cp = 0xfe80; cp <= 0xfefc; cp++) {
  const glyph = String.fromCodePoint(cp);
  const base = glyph.normalize("NFKC");
  const forms = ARABIC_FORMS.get(base);
  if (!forms) ARABIC_FORMS.set(base, { iso: glyph });
  else if (!forms.fin) forms.fin = glyph;
  else if (!forms.ini) forms.ini = glyph;
  else forms.med = glyph;
}

const isMark = (ch: string) => /\p{M}/u.test(ch);
const joinsNext = (ch: string) =>
  ch === "\u0640" || !!ARABIC_FORMS.get(ch)?.med;
const joinsPrev = (ch: string) =>
  ch === "\u0640" || !!ARABIC_FORMS.get(ch)?.fin;

function shapeArabic(run: string): string {
  const clusters: { base: string; marks: string }[] = [];
  for (const ch of Array.from(run)) {
    if (isMark(ch) && clusters.length)
      clusters[clusters.length - 1]!.marks += ch;
    else clusters.push({ base: ch, marks: "" });
  }
  const out: string[] = [];
  for (let i = 0; i < clusters.length; i++) {
    const { base, marks } = clusters[i]!;
    const prevJoins = i > 0 && joinsNext(clusters[i - 1]!.base);
    const next = clusters[i + 1];
    const ligature = next && ARABIC_FORMS.get(base + next.base);
    if (ligature) {
      out.push(marks + next.marks + (prevJoins ? ligature.fin : ligature.iso));
      i++;
      continue;
    }
    const forms = ARABIC_FORMS.get(base);
    const nextJoins = !!next && joinsPrev(next.base);
    let glyph = base;
    if (forms) {
      glyph =
        (prevJoins && nextJoins && joinsNext(base) ? forms.med : undefined) ??
        (nextJoins && joinsNext(base) ? forms.ini : undefined) ??
        (prevJoins ? forms.fin : undefined) ??
        forms.iso;
    }
    out.push(marks + glyph);
  }
  return out.reverse().join("");
}

function RtlText({
  gap,
  style,
  text,
}: {
  gap: number;
  style: React.CSSProperties;
  text: string;
}) {
  return (
    <div
      style={{
        alignContent: "flex-start",
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        columnGap: gap,
        ...style,
      }}
    >
      {rtlWords(text).map((runs, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            flexShrink: 0,
          }}
        >
          {runs.map((run, j) => (
            <span key={j}>
              {run.kind === "A" ? shapeArabic(run.text) : run.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = toLocale(locale);
  const meta = LOCALE_META[loc];
  const copy = OG_COPY[loc];
  // Direction decides layout and the bidi-run renderer; the script decides
  // the face and whether case and tracking apply.
  const rtl = meta.dir === "rtl";
  const cased = scriptHasCase(meta.script);

  const [latinRegular, latinBold, arabicRegular, arabicBold] =
    await Promise.all([
      loadBrandFont("Latin", 400),
      loadBrandFont("Latin", 700),
      loadBrandFont("Arabic", 400),
      loadBrandFont("Arabic", 700),
    ]);

  const fontFamily = `brand-${meta.script}`;

  const eyebrow = {
    color: css(PALETTE.light["n-5"]),
    display: "flex",
    fontSize: 24,
    ...(cased
      ? { letterSpacing: "0.22em", textTransform: "uppercase" as const }
      : {}),
  };
  const headingStyle = {
    display: "flex",
    fontSize: 58,
    fontWeight: 700,
    ...(cased
      ? { letterSpacing: "-0.04em", lineHeight: 1.04 }
      : { lineHeight: 1.3 }),
    ...(rtl ? {} : { textAlign: "left" as const }),
  };
  const subStyle = {
    color: css(PALETTE.light["n-6"]),
    display: "flex",
    fontSize: 28,
    lineHeight: 1.4,
    maxWidth: 920,
    ...(rtl ? {} : { textAlign: "left" as const }),
  };
  const rowDirection = rtl ? ("row-reverse" as const) : ("row" as const);

  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: css(PALETTE.light["n-0"]),
        color: css(PALETTE.light["n-8"]),
        display: "flex",
        fontFamily,
        height: "100%",
        justifyContent: "space-between",
        padding: "72px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: rowDirection,
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {rtl ? (
            <RtlText gap={6} style={eyebrow} text={copy.eyebrow} />
          ) : (
            <div style={eyebrow}>{copy.eyebrow}</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            maxWidth: 920,
            ...(rtl ? { alignSelf: "flex-end", width: 920 } : {}),
          }}
        >
          {rtl ? (
            <RtlText gap={9} style={headingStyle} text={copy.heading} />
          ) : (
            <div style={headingStyle}>{copy.heading}</div>
          )}
          {rtl ? (
            <RtlText gap={4} style={subStyle} text={copy.sub} />
          ) : (
            <div style={subStyle}>{copy.sub}</div>
          )}
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: rowDirection,
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              textTransform: "uppercase",
            }}
          >
            {SITE_CONFIG.name}
          </div>
          <div
            style={{
              color: css(PALETTE.light["n-5"]),
              display: "flex",
              flexDirection: rowDirection,
              fontSize: 22,
              gap: "16px",
            }}
          >
            <span>
              {(SITE_CONFIG.url ?? "altruvex.com").replace(/^https?:\/\//, "")}
            </span>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          data: latinRegular,
          name: "brand-latin",
          style: "normal",
          weight: 400,
        },
        { data: latinBold, name: "brand-latin", style: "normal", weight: 700 },
        {
          data: arabicRegular,
          name: "brand-arabic",
          style: "normal",
          weight: 400,
        },
        {
          data: arabicBold,
          name: "brand-arabic",
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
