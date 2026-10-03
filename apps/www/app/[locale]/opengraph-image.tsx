import { SITE_CONFIG, normalizeLocale } from "@/lib/metadata";
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

// Altruvex Sans comes from @repo/brand-font, read from disk at render time: no
// network fetch. Satori reads neither WOFF2 nor variable axes, so the package
// ships static TTF instances (dist/og), cut from the same variable fonts the
// site serves, at the two weights used below. process.cwd() is apps/www under
// next dev/build/start, and output tracing follows a literal path.join from it.
const BRAND_OG = join(process.cwd(), "node_modules/@repo/brand-font/dist/og");

function loadBrandFont(face: "Latin" | "Arabic", weight: 400 | 700) {
  return readFile(join(BRAND_OG, `AltruvexSans${face}-${weight}.ttf`));
}

/**
 * Satori runs no bidi algorithm: it lays text out left to right in logical
 * order, so an Arabic sentence comes out with its words reversed. Instead of a
 * bidi dependency (the line breaks that reordering needs are Satori's own, and
 * unavailable to us), Arabic copy is laid out word by word: each word is one
 * flex item, the row is `row-reverse` + `wrap` so words start at the right edge
 * and lines wrap from the right, and each word is split into direction runs so
 * "Next.js", "B2B" and digits keep their internal LTR order. Letter joining
 * inside a run is left to Satori, which already shapes Arabic correctly.
 */
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

// Strong class of one character: Latin letters and digits are L, Arabic script
// is R, everything else (spaces, punctuation) is neutral. Combining marks
// inherit the class of the letter they sit on.
function strongClass(ch: string, previous: "L" | "R" | "N"): "L" | "R" | "N" {
  if (/[\p{Script=Latin}\p{N}]/u.test(ch)) return "L";
  if (/[\p{Script=Arabic}\u0640]/u.test(ch)) return "R";
  if (/\p{M}/u.test(ch)) return previous;
  return "N";
}

// Splits a right-to-left paragraph into words, and each word into runs, in
// logical order (first run = rightmost on screen). A neutral takes its
// neighbours' direction when both agree (the "." in "Next.js", the spaces in
// "Next.js and React"); otherwise it takes the paragraph direction, right to
// left. That is what puts a sentence-final "." on the left of the last word.
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
      // Neutrals in an RTL run read right to left, so later ones go first.
      last.text =
        kind === "P" ? (MIRRORED[ch] ?? ch) + last.text : last.text + ch;
    } else {
      word.push({ kind, text: kind === "P" ? (MIRRORED[ch] ?? ch) : ch });
    }
  });
  if (word.length) words.push(word);
  return words;
}

// Satori sizes a text box by summing the width of each character alone, i.e.
// its isolated glyph, while it draws the joined forms, which are narrower. An
// Arabic word's box is therefore wider than its ink, and the gaps between
// words come out uneven. So Arabic runs are shaped here instead: each letter
// is swapped for its contextual form from Unicode's Arabic Presentation Forms-B
// block (which Altruvex Sans Arabic covers), and the run is emitted in visual
// order, so the box is measured on the glyphs that are actually drawn. The
// table is read from Unicode itself (the compatibility decomposition of each
// form gives its base letter), so nothing is hand-typed.
type Forms = { fin?: string; iso: string; ini?: string; med?: string };
const ARABIC_FORMS = new Map<string, Forms>();
for (let cp = 0xfe80; cp <= 0xfefc; cp++) {
  const glyph = String.fromCodePoint(cp);
  const base = glyph.normalize("NFKC");
  const forms = ARABIC_FORMS.get(base);
  // Each base's forms are consecutive: isolated, final, initial, medial.
  if (!forms) ARABIC_FORMS.set(base, { iso: glyph });
  else if (!forms.fin) forms.fin = glyph;
  else if (!forms.ini) forms.ini = glyph;
  else forms.med = glyph;
}

const isMark = (ch: string) => /\p{M}/u.test(ch);
// Joins the letter after it: dual-joining letters (four forms) and tatweel.
const joinsNext = (ch: string) =>
  ch === "\u0640" || !!ARABIC_FORMS.get(ch)?.med;
// Joins the letter before it: every letter with a final form, and tatweel.
const joinsPrev = (ch: string) =>
  ch === "\u0640" || !!ARABIC_FORMS.get(ch)?.fin;

function shapeArabic(run: string): string {
  // A cluster is a letter plus the marks stacked on it; marks are transparent
  // to joining and stay glued to their letter. The font's marks are cut for
  // right-to-left order (zero advance, drawn over the glyph that follows), so in
  // the left-to-right string Satori draws they precede their letter.
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
    // Lam + alef is one mandatory ligature glyph.
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
  // Satori draws left to right, so emit the clusters in visual order.
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
  const loc = normalizeLocale(locale);

  const isArabic = loc === "ar";

  const [latinRegular, latinBold, arabicRegular, arabicBold] =
    await Promise.all([
      loadBrandFont("Latin", 400),
      loadBrandFont("Latin", 700),
      loadBrandFont("Arabic", 400),
      loadBrandFont("Arabic", 700),
    ]);

  // Satori falls back across the loaded fonts per glyph, so the Arabic in the
  // English card ("English + العربية") draws in the Arabic face, and vice versa.
  const fontFamily = isArabic ? "brand-arabic" : "brand-latin";

  // Arabic has no case and no tracking; Latin keeps both.
  const eyebrow = {
    color: css(PALETTE.light["n-5"]),
    display: "flex",
    fontSize: 24,
    ...(isArabic
      ? {}
      : { letterSpacing: "0.22em", textTransform: "uppercase" as const }),
  };
  const pill = {
    alignItems: "center",
    background: "rgba(15,15,15,0.06)",
    border: "1px solid rgba(15,15,15,0.1)",
    borderRadius: 999,
    color: css(PALETTE.light["n-6"]),
    display: "flex",
    fontSize: 22,
    height: 48,
    padding: "0 18px",
    ...(isArabic
      ? {}
      : { letterSpacing: "0.08em", textTransform: "uppercase" as const }),
  };
  const headingStyle = {
    display: "flex",
    fontSize: 58,
    fontWeight: 700,
    ...(isArabic
      ? { lineHeight: 1.3 }
      : {
          letterSpacing: "-0.04em",
          lineHeight: 1.04,
          textAlign: "left" as const,
        }),
  };
  const subStyle = {
    color: css(PALETTE.light["n-6"]),
    display: "flex",
    fontSize: 28,
    lineHeight: 1.4,
    maxWidth: 920,
    ...(isArabic ? {} : { textAlign: "left" as const }),
  };
  // The site mirrors in RTL: corner items swap sides, so every row that pairs
  // two items runs row-reverse in Arabic.
  const rowDirection = isArabic ? ("row-reverse" as const) : ("row" as const);

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
          {isArabic ? (
            <RtlText gap={6} style={eyebrow} text="استوديو تطوير ويب" />
          ) : (
            <div style={eyebrow}>WEB ENGINEERING STUDIO</div>
          )}
          <div style={pill}>{isArabic ? "القاهرة" : "CAIRO"}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            maxWidth: 920,
            ...(isArabic ? { alignSelf: "flex-end", width: 920 } : {}),
          }}
        >
          {isArabic ? (
            <RtlText
              gap={9}
              style={headingStyle}
              text="تطوير مواقع ويب مخصصة للأنظمة متعددة اللغات الموجّهة للأعمال."
            />
          ) : (
            <div style={headingStyle}>
              Custom web development for multilingual B2B systems.
            </div>
          )}
          {isArabic ? (
            <RtlText
              gap={4}
              style={subStyle}
              text="تطوير ويب مخصص وNext.js واستشارات تقنية للفرق التي تحتاج أداءً ومصداقيةً وجودة تنفيذ من اليوم الأول."
            />
          ) : (
            <div style={subStyle}>
              Architecture-first builds. Performance by default. Founder-direct.
            </div>
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
            {isArabic ? (
              <RtlText
                gap={4}
                style={{ color: css(PALETTE.light.brand) }}
                text="العربية + English"
              />
            ) : (
              <span style={{ color: css(PALETTE.light.brand) }}>
                English + العربية
              </span>
            )}
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
