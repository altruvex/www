"""Desktop builds: static TTFs of the web faces, named for installation.

Usage: uv run python tools/desktop.py

The proposal deck (pptxgenjs) and contract (docx) name their fonts and embed nothing, and the PDF
is rendered by LibreOffice from whatever is installed on that machine. So the brand face can reach
those documents only as an installed font, and an installed font needs a desktop naming scheme the
web files do not have: one family per script, the four RIBBI styles grouped under it, the other
weights as their own legacy families with a shared typographic family (IDs 16/17).

Every file is instanced from the files apps/www ships (dist/web), never from the sources, so a
document cannot draw a different outline, advance or kern than the site:

  Altruvex Sans         300 Light, 400 Regular, 500 Medium, 700 Bold, each with its italic
                        (the drawn italic of tools/italic.py)
  Altruvex Sans Arabic  300, 400, 500, 700 upright (Arabic has no italic); the avar remap
                        applies, so a requested 700 draws what the site draws at 700

Outputs dist/desktop/*.ttf, the OFL texts beside them, and dist/desktop-report.json.
Run it after build.py and italic.py; it reads their outputs.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

from config import ROOT, load

WEB = ROOT / "dist" / "web"
OUT = ROOT / "dist" / "desktop"
REPORT = ROOT / "dist" / "desktop-report.json"
LICENSES = ("OFL-Outfit.txt", "OFL-Vazirmatn.txt", "FONTLOG.txt")
WEIGHTS = (300, 400, 500, 700)
STYLE = {300: "Light", 400: "Regular", 500: "Medium", 700: "Bold"}
# family name, PostScript prefix, upright VF, whether the drawn italic exists
FAMILIES = (
    ("Altruvex Sans", "AltruvexSans", "AltruvexSansLatin-VF.woff2", True),
    ("Altruvex Sans Arabic", "AltruvexSansArabic", "AltruvexSansArabic-VF.woff2", False),
)
VAR_TABLES = ("STAT", "fvar", "avar", "gvar", "HVAR", "MVAR", "cvar")


def style_name(weight: int, italic: bool) -> str:
    """Typographic style: Light, Italic, Medium Italic, Bold Italic, Regular."""
    if weight == 400:
        return "Italic" if italic else "Regular"
    return STYLE[weight] + (" Italic" if italic else "")


def name_desktop(f: TTFont, family: str, ps_prefix: str, weight: int, italic: bool, version: str) -> str:
    """Names and style bits of one desktop static. Regular, Italic, Bold and Bold Italic share the
    legacy family (ID 1) so applications that offer only B and I buttons link them; Light and
    Medium are their own legacy family. All of them share the typographic family (ID 16)."""
    style = style_name(weight, italic)
    ribbi = weight in (400, 700)
    legacy_family = family if ribbi else f"{family} {STYLE[weight]}"
    legacy_style = ("Bold " if weight == 700 else "") + ("Italic" if italic else "")
    legacy_style = legacy_style.strip() or "Regular"
    ps = f"{ps_prefix}-{style.replace(' ', '')}"
    name = f["name"]
    for nid in [n.nameID for n in name.names if n.nameID == 25 or n.nameID >= 256]:
        name.removeNames(nameID=nid)
    for nid, value in {1: legacy_family, 2: legacy_style, 3: f"{version};ALTRUVEX;{ps}",
                       4: f"{family} {style}", 6: ps, 16: family, 17: style}.items():
        name.removeNames(nameID=nid)
        name.setName(value, nid, 3, 1, 0x409)
    for t in VAR_TABLES:
        if t in f:
            del f[t]
    os2 = f["OS/2"]
    os2.usWeightClass = weight
    sel = os2.fsSelection & ~0b1100001  # clear ITALIC (0), BOLD (5), REGULAR (6)
    if italic:
        sel |= 1
    if weight == 700:
        sel |= 1 << 5
    if weight == 400 and not italic:
        sel |= 1 << 6
    os2.fsSelection = sel
    f["head"].macStyle = (2 if italic else 0) | (1 if weight == 700 else 0)
    return ps


def load_static(family_file: str, weight: int, italic: bool) -> TTFont:
    """The web face at one weight as a static TTF. head.modified stays the web file's, so the same
    inputs give the same bytes."""
    if italic:
        f = TTFont(WEB / f"AltruvexSansLatin-Italic-{weight}.woff2", recalcTimestamp=False)
    else:
        f = instantiateVariableFont(TTFont(WEB / family_file, recalcTimestamp=False), {"wght": weight})
    f.recalcTimestamp = False
    f.flavor = None
    return f


def build(out: Path = OUT, report_path: Path = REPORT) -> dict:
    version = load().build.version
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    report: dict = {"version": version, "files": {}}
    for family, ps_prefix, family_file, has_italic in FAMILIES:
        for weight in WEIGHTS:
            for italic in (False, True) if has_italic else (False,):
                f = load_static(family_file, weight, italic)
                ps = name_desktop(f, family, ps_prefix, weight, italic, version)
                path = out / f"{ps}.ttf"
                f.save(path)
                report["files"][path.name] = {
                    "family": family, "style": style_name(weight, italic), "weight": weight,
                    "bytes": path.stat().st_size,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                }
    for lic in LICENSES:
        shutil.copy2(ROOT / "licenses" / lic, out / lic)
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


if __name__ == "__main__":
    for name, row in build()["files"].items():
        print(f"{name:36} {row['family']:22} {row['style']:14} {row['bytes']:>7}")
