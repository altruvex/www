"""HarfBuzz regression for the built web fonts (step 25): shape text the way a browser would with the
production stacks, and measure mark collisions at the approved weight pairs.

Usage: uv run python tools/shaping.py

Writes dist/harfbuzz-report.json (sorted keys) and prints a compact summary.

Shaping model (what a browser does with --stack-prod-ar / --stack-prod-en):
- font fallback per character: the first family in the stack whose cmap has it wins; a combining
  mark or joiner stays with the font of the character before it;
- a simplified bidi pass: R/AL are right-to-left, L/EN/AN left-to-right (numbers are an LTR level
  even inside Arabic), neutrals take the direction of their strong neighbours when both agree and
  the paragraph direction otherwise, marks inherit;
- each (font, direction) run is shaped with the whole string as context, so joining carries across
  run boundaries, and runs are reordered visually (UBA rule L2) before layout.

Mark collision metric (target < 0.02 em): the shaped line is rasterized at PX pixels per em, each
glyph outline drawn by HarfBuzz at the requested variation and placed at its HarfBuzz position; a
pixel is ink at >= 50% coverage. For each mark glyph (GDEF class 3), overlap = its ink AND the union
of every other glyph's ink (its base and neighbouring marks included). The collision value is the
largest number of overlapping pixels in any one pixel column, divided by PX, in em: the thickness of
the worst vertical intrusion. 0 means the mark's ink touches nothing.
"""
from __future__ import annotations

import io
import json
import unicodedata
from dataclasses import dataclass
from functools import cache

import numpy as np
import uharfbuzz as hb
from fontTools.pens.freetypePen import FreeTypePen
from fontTools.ttLib import TTFont

from build import weight_pairs
from config import ROOT, load

WEB = ROOT / "dist" / "web"
FILES = {"ar": WEB / "AltruvexSansArabic-VF.woff2", "en": WEB / "AltruvexSansLatin-VF.woff2"}
STACKS = {"ar": ("ar", "en"), "en": ("en", "ar")}  # proofs/fonts.css --stack-prod-ar / -en
REPORT = ROOT / "dist" / "harfbuzz-report.json"

# Approved final pairs (requested weights; the Arabic avar maps 600 and 700 to their drawn values).
WEIGHT_PAIRS = (400, 600, 700)
TARGET_EM = 0.02
PX = 256

VOCALISED = (
    "إِنَّ الشُّرُوطَ مَكْتُوبَةٌ",
    "شَدَّةٌ",
    "فِيَّ",
    "بِيَدِي",
    "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    "وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ",
    "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
)


@dataclass(frozen=True)
class Glyph:
    font: str  # "ar" | "en"
    gid: int
    name: str
    cluster: int  # index into the shaped string
    x: float  # em, pen position + offset
    y: float  # em
    x_offset: int  # font units, as HarfBuzz returned them
    y_offset: int
    mark: bool


@cache
def ttfont(key: str) -> TTFont:
    return TTFont(FILES[key])


@cache
def face(key: str) -> hb.Face:
    f = TTFont(FILES[key])
    f.flavor = None  # woff2 -> sfnt bytes for HarfBuzz
    buf = io.BytesIO()
    f.save(buf)
    return hb.Face(buf.getvalue())


def hb_font(key: str, weight: int) -> hb.Font:
    font = hb.Font(face(key))
    font.set_variations({"wght": weight})
    return font


@cache
def marks(key: str) -> frozenset[str]:
    gdef = ttfont(key)["GDEF"].table.GlyphClassDef
    return frozenset(n for n, c in gdef.classDefs.items() if c == 3) if gdef else frozenset()


def has(key: str, ch: str) -> bool:
    return ord(ch) in ttfont(key).getBestCmap()


def _direction(ch: str) -> str | None:
    bidi = unicodedata.bidirectional(ch)
    if bidi in ("R", "AL"):
        return "rtl"
    if bidi in ("L", "EN", "AN"):
        return "ltr"
    return None  # neutral or mark: resolved from context


def itemize(text: str, lang: str) -> list[tuple[int, int, str, str]]:
    """(start, end, font, direction) runs in logical order."""
    para = "rtl" if lang == "ar" else "ltr"
    fonts: list[str] = []
    for i, ch in enumerate(text):
        joins = unicodedata.combining(ch) or ch in "‌‍"
        if joins and i and has(fonts[-1], ch):
            fonts.append(fonts[-1])
        else:
            fonts.append(next((k for k in STACKS[lang] if has(k, ch)), STACKS[lang][0]))
    dirs = [_direction(ch) for ch in text]
    for i, ch in enumerate(text):
        if dirs[i] is None and unicodedata.bidirectional(ch) == "NSM" and i:
            dirs[i] = dirs[i - 1]
    strong = list(dirs)
    for i, d in enumerate(strong):
        if d is None:
            before = next((x for x in reversed(strong[:i]) if x), None)
            after = next((x for x in strong[i + 1:] if x), None)
            dirs[i] = before if before and before == after else para
    runs: list[tuple[int, int, str, str]] = []
    for i in range(len(text)):
        if runs and runs[-1][2] == fonts[i] and runs[-1][3] == dirs[i]:
            runs[-1] = (runs[-1][0], i + 1, fonts[i], dirs[i])
        else:
            runs.append((i, i + 1, fonts[i], dirs[i]))
    return runs


def _visual(runs: list, para: str) -> list:
    """UBA rule L2 over whole runs: levels 0/1 in an LTR paragraph, 1/2 in an RTL one."""
    level = {("ltr", "ltr"): 0, ("ltr", "rtl"): 1, ("rtl", "rtl"): 1, ("rtl", "ltr"): 2}
    items = [(level[(para, r[3])], r) for r in runs]
    for lv in range(max((x[0] for x in items), default=0), 0, -1):
        out, i = [], 0
        while i < len(items):
            j = i
            while j < len(items) and items[j][0] >= lv:
                j += 1
            if j > i:
                out.extend(reversed(items[i:j]))
                i = j
            else:
                out.append(items[i])
                i += 1
        items = out
    return [r for _, r in items]


def shape(text: str, lang: str = "ar", weight: int = 400) -> list[Glyph]:
    """Shape and lay out one line; glyphs in visual order, positions in em from the line start."""
    fonts = {k: hb_font(k, weight) for k in FILES}
    cps = [ord(c) for c in text]
    pen, out = 0.0, []
    for start, end, key, direction in _visual(itemize(text, lang), "rtl" if lang == "ar" else "ltr"):
        buf = hb.Buffer()
        buf.add_codepoints(cps, start, end - start)
        # A browser marks the paragraph edges; HarfBuzz only inserts a dotted circle for a
        # broken cluster at the beginning of text when it knows it is there.
        buf.flags = (hb.BufferFlags.BOT if start == 0 else 0) | (hb.BufferFlags.EOT if end == len(text) else 0)
        buf.guess_segment_properties()
        buf.direction = direction
        buf.language = lang
        hb.shape(fonts[key], buf, {})
        upem = face(key).upem
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            name = ttfont(key).getGlyphName(info.codepoint)
            out.append(Glyph(key, info.codepoint, name, info.cluster,
                             pen + pos.x_offset / upem, pos.y_offset / upem,
                             pos.x_offset, pos.y_offset, name in marks(key)))
            pen += pos.x_advance / upem
    return out


def _ink(glyphs: list[Glyph], weight: int) -> list[np.ndarray]:
    fonts = {k: hb_font(k, weight) for k in FILES}
    left = min(g.x for g in glyphs) - 1
    width = int((max(g.x for g in glyphs) - left + 2) * PX)
    height, base = 4 * PX, 1.5 * PX  # 1.5 em below the baseline, 2.5 em above
    masks = []
    for g in glyphs:
        pen = FreeTypePen(None)
        fonts[g.font].draw_glyph_with_pen(g.gid, pen)
        s = PX / face(g.font).upem
        cov = pen.array(width, height, transform=(s, 0, 0, s, (g.x - left) * PX, base + g.y * PX))
        masks.append(cov >= 0.5)
    return masks


def collisions(text: str, weight: int, lang: str = "ar") -> list[dict]:
    """One row per mark glyph: its worst overlap with any other glyph's ink, in em."""
    return overlaps(text, shape(text, lang, weight), weight)


def overlaps(text: str, glyphs: list[Glyph], weight: int) -> list[dict]:
    masks = _ink(glyphs, weight)
    rows = []
    for i, g in enumerate(glyphs):
        if not g.mark:
            continue
        worst, hit = 0, None
        for j, other in enumerate(masks):
            if j == i:
                continue
            cols = int((masks[i] & other).sum(axis=0).max())
            if cols > worst:
                worst, hit = cols, glyphs[j].name
        rows.append({"text": text, "weight": weight, "mark": g.name, "cluster": g.cluster,
                     "base": text[g.cluster], "against": hit, "overlap_em": round(worst / PX, 4)})
    return rows


def normalized_wght(key: str, weight: int) -> float:
    return hb_font(key, weight).get_var_coords_normalized()[0]


def collect() -> dict:
    drawn = dict(weight_pairs(load().weights))
    pairs = {}
    for w in WEIGHT_PAIRS:
        rows = [r for t in VOCALISED for r in collisions(t, w)]
        worst = max(rows, key=lambda r: r["overlap_em"])
        notdef = sum(g.gid == 0 for t in VOCALISED for g in shape(t, "ar", w))
        pairs[str(w)] = {
            "en_weight": w,
            "ar_requested": w,
            "ar_drawn": drawn.get(w, w),
            "ar_normalized_wght": round(normalized_wght("ar", w), 5),
            "marks": len(rows),
            "max_overlap_em": worst["overlap_em"],
            "worst": worst,
            "over_target": [r for r in rows if r["overlap_em"] >= TARGET_EM],
            "notdef": notdef,
            "pass": worst["overlap_em"] < TARGET_EM and notdef == 0,
            "table": rows,
        }
    return {
        "metric": f"max per-column overlapping ink pixels / {PX} px per em, mark vs any other glyph",
        "target_em": TARGET_EM,
        "samples": list(VOCALISED),
        "pairs": pairs,
        "pass": all(p["pass"] for p in pairs.values()),
    }


def main() -> None:
    rep = collect()
    REPORT.write_text(json.dumps(rep, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    for w, p in rep["pairs"].items():
        wr = p["worst"]
        print(f"EN {w} <-> AR {w} (draws {p['ar_drawn']}): {p['marks']} marks, max {p['max_overlap_em']:.4f}em "
              f"[{wr['mark']} vs {wr['against']} in {wr['text']}], over target {len(p['over_target'])}, "
              f"notdef {p['notdef']} -> {'PASS' if p['pass'] else 'FAIL'}")
    print(f"target < {rep['target_em']}em: {'PASS' if rep['pass'] else 'FAIL'} -> {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
