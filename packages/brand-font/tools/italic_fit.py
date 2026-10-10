"""Fit the frozen drawn italic to the Inter upright.

Usage: uv run python tools/italic_fit.py

The drawn italic (tools/italic.py, 2026-10-03) was built on Outfit and is frozen as it was (Ali,
2026-10-10): frozen/italic-outfit-2026-10-03/ holds those four files byte for byte. Next to the
Inter upright its x-height was smaller (0.475em against 0.516em), so Ali asked for it to be fixed
in the font itself, not in CSS (2026-10-10).

This script scales every glyph of the frozen files uniformly, so no outline changes shape: points,
advances, kerning and anchors are all multiplied by one factor, through fontTools' scale_upem, and
the unitsPerEm is then set back. The factor is derived per weight, never typed: the Inter
upright's x-height at opsz 32 and that weight (the size headings render at, where the italic is
used) over the frozen italic's at the same weight. Outfit's italic x-height grows with weight
(0.470 to 0.486em) while Inter's does not, so one factor would leave 300 and 700 off.
Vertical metrics (hhea, OS/2 typo) are restored, so the line box of an italic run does not change;
usWinAscent/Descent grow only if the scaled outlines would be clipped.

Outputs dist/web/AltruvexSansLatin-Italic-{300,400,500,700}.woff2. Run tools/desktop.py after it.
"""

from __future__ import annotations

from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem
from fontTools.varLib.instancer import instantiateVariableFont

from config import ROOT

FROZEN = ROOT / "frozen" / "italic-outfit-2026-10-03"
WEB = ROOT / "dist" / "web"
WEIGHTS = (300, 400, 500, 700)
# Headings, where the emphasis clause is set, render the upright at its largest optical size.
HEADING_OPSZ = 32


def x_height(font: TTFont) -> float:
    glyphs = font.getGlyphSet()
    pen = BoundsPen(glyphs)
    glyphs[font.getBestCmap()[ord("x")]].draw(pen)
    return pen.bounds[3] / font["head"].unitsPerEm


def fit(path: Path, factor: float) -> TTFont:
    font = TTFont(path)
    upem = font["head"].unitsPerEm
    hhea, os2 = font["hhea"], font["OS/2"]
    kept = {
        "hhea": (hhea.ascent, hhea.descent, hhea.lineGap),
        "typo": (os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap),
        "win": (os2.usWinAscent, os2.usWinDescent),
    }
    scale_upem(font, round(upem * factor))
    font["head"].unitsPerEm = upem
    hhea.ascent, hhea.descent, hhea.lineGap = kept["hhea"]
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = kept["typo"]
    font["head"].recalcBBoxes = True
    glyf = font["glyf"]
    y_max = max((glyf[g].yMax for g in font.getGlyphOrder() if glyf[g].numberOfContours), default=0)
    y_min = min((glyf[g].yMin for g in font.getGlyphOrder() if glyf[g].numberOfContours), default=0)
    os2.usWinAscent = max(kept["win"][0], y_max)
    os2.usWinDescent = max(kept["win"][1], -y_min)
    return font


if __name__ == "__main__":
    for w in WEIGHTS:
        name = f"AltruvexSansLatin-Italic-{w}.woff2"
        upright = instantiateVariableFont(TTFont(WEB / "AltruvexSansLatin-VF.woff2"),
                                          {"opsz": HEADING_OPSZ, "wght": w})
        target = x_height(upright)
        source = x_height(TTFont(FROZEN / name))
        factor = target / source
        font = fit(FROZEN / name, factor)
        font.flavor = "woff2"
        font.save(WEB / name)
        print(f"{name}: x-height {source:.4f} -> {x_height(TTFont(WEB / name)):.4f} em "
              f"(upright {target:.4f}), factor {factor:.4f}")
