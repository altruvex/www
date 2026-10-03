"""Font-level measurements for the build report (em units, at a given weight)."""
from __future__ import annotations

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

# Vazirmatn's own space (0.26782em at 2048 UPM) x k 1.0625, the target for Arabic word space.
ARABIC_WORD_SPACE_REFERENCE_EM = 0.285


def _glyph(font: TTFont, cp: int, wght: float):
    gs = font.getGlyphSet(location={"wght": wght})
    return gs[font.getBestCmap()[cp]]


def bounds(font: TTFont, cp: int, wght: float = 400) -> tuple[float, float]:
    gs = font.getGlyphSet(location={"wght": wght})
    pen = BoundsPen(gs)
    gs[font.getBestCmap()[cp]].draw(pen)
    upm = font["head"].unitsPerEm
    _, ymin, _, ymax = pen.bounds
    return ymin / upm, ymax / upm


def advance(font: TTFont, cp: int, wght: float = 400) -> float:
    return _glyph(font, cp, wght).width / font["head"].unitsPerEm


def vertical(font: TTFont) -> dict:
    upm = font["head"].unitsPerEm
    h, o = font["hhea"], font["OS/2"]
    r = lambda v: round(v / upm, 4)
    return {
        "hhea": {"ascent": r(h.ascent), "descent": r(h.descent), "lineGap": r(h.lineGap)},
        "typo": {"ascender": r(o.sTypoAscender), "descender": r(o.sTypoDescender),
                 "lineGap": r(o.sTypoLineGap)},
        "win": {"ascent": r(o.usWinAscent), "descent": r(o.usWinDescent)},
        "bbox": {"yMin": r(font["head"].yMin), "yMax": r(font["head"].yMax)},
    }


def report(latin: TTFont, arabic: TTFont, arabic_source: TTFont, k: float) -> dict:
    r = lambda v: round(v, 4)
    alef_out = bounds(arabic, 0x0627)[1]
    alef_src = bounds(arabic_source, 0x0627)[1]
    return {
        "weight": 400,
        "latin": {
            "ascender_h": r(bounds(latin, ord("h"))[1]),
            "cap_height_H": r(bounds(latin, ord("H"))[1]),
            "x_height_x": r(bounds(latin, ord("x"))[1]),
            "vertical": vertical(latin),
        },
        "arabic": {
            "alef": r(alef_out),
            "alef_source": r(alef_src),
            "tooth_medial_beh_FE92": r(bounds(arabic, 0xFE92)[1]),
            "yeh_bottom_064A": r(bounds(arabic, 0x064A)[0]),
            "vertical": vertical(arabic),
        },
        "scale": {
            "k": k,
            "k_effective_alef": r(alef_out / alef_src),
            "alef_rounding_error_em": round(alef_out - alef_src * k, 6),
            "alef_vs_latin_ascender_em": r(alef_out - bounds(latin, ord("h"))[1]),
        },
        "word_space": {
            "latin_space_em": r(advance(latin, 0x20)),
            "arabic_space_em": r(advance(arabic, 0x20)),
            "arabic_reference_em": ARABIC_WORD_SPACE_REFERENCE_EM,
            "arabic_nbsp_em": r(advance(arabic, 0xA0)),
            "arabic_thin_space_2009_em": r(advance(arabic, 0x2009)),
            "arabic_narrow_nbsp_202F_em": r(advance(arabic, 0x202F)),
        },
    }
