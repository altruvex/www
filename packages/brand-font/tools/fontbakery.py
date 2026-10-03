"""FontBakery check-universal on the two web fonts (phase A.4, step 24).

Usage: uv run python tools/fontbakery.py [--out dist/fontbakery-report.json]

FontBakery runs isolated through uvx, never in the project env. Its results move with fontTools,
OTS and HarfBuzz, so those are pinned next to it. It reads TTF, not woff2: each web font is
decompressed with the project's fontTools into a temp dir under its own name. --skip-network keeps
the run reproducible (the network checks compare against live services). Each font is its own
family, so each is checked on its own.

Every FAIL must be listed in KNOWN_FAILS and every WARN in DECISIONS; the tests fail on a new one
and on an entry that no longer occurs. No check is excluded. A clean run is not typography approval.
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import subprocess
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont

from config import ROOT

VERSION = "1.1.0"
PINS = ("fonttools==4.66.0", "opentype-sanitizer==9.2.0", "uharfbuzz==0.56.2", "freetype-py==2.3.0")
FONTS = {
    "latin": ROOT / "dist" / "web" / "AltruvexSansLatin-VF.woff2",
    "arabic": ROOT / "dist" / "web" / "AltruvexSansArabic-VF.woff2",
}
REPORT = ROOT / "dist" / "fontbakery-report.json"
MESSAGE_CHARS = 300
# --full-lists: a shortened list keeps whichever items FontBakery happened to emit first.
PROFILE = ("check-universal", "--skip-network", "--full-lists")

# FAILs that stay until a change outside this tool lands. Each needs the lead or Ali.
KNOWN_FAILS = {
    "latin": {},
    "arabic": {
        "mandatory_glyphs": "accepted (2026-09-30): Vazirmatn's own .notdef is blank (same FAIL on "
                            "the source). On the web a missing character falls through the stack "
                            "to the next family, so this .notdef is not drawn in practice. Track A "
                            "adds no glyphs; a drawn .notdef belongs with the Track B outlines.",
    },
}

DECISIONS = {
    "latin": {
        "mandatory_avar_table": "accept: Outfit ships without avar (same WARN on the source); adding "
                                "one would move every weight that tracking and the pairs were "
                                "measured on.",
        "unreachable_glyphs": "accept: NULL and i.loclTRK are unreachable in the Outfit source too; "
                              "removing them changes the glyph set, out of scope for Track A.",
    },
    "arabic": {
        "arabic_high_hamza": "accept: upstream Vazirmatn outline (same WARN on the source); glyphs "
                             "are not edited.",
        "gpos_kerning_info": "accept: the kern feature is kept (Vazirmatn's Arabic kern is chained "
                             "contextual, type 8); the check counts only pair (type 2) lookups, "
                             "which were Latin-only and left with the Latin glyphs.",
        "interpolation_issues": "accept: contour order / start points differ in the Vazirmatn "
                                "masters (same WARN on the source); a fix is a glyph edit. The "
                                "step 26 proof shows the rendered weights.",
        "ligature_carets": "accept: Vazirmatn has no GDEF ligature carets (same WARN on the source); "
                           "engines split the caret evenly inside lam-alef.",
        "opentype/gdef_mark_chars": "accept: Vazirmatn leaves U+0658 out of the GDEF mark class "
                                    "(same WARN on the source); reclassifying changes which "
                                    "lookups skip it.",
        "opentype/post_table_version": "accept: post format 3 because build.py drops glyph names "
                                       "(glyph_names=False) to save bytes in a web font; names "
                                       "only matter to niche PDF text extraction.",
    },
}


def available() -> str | None:
    """None when the pinned FontBakery runs, else the reason it does not (no uvx, no network)."""
    try:
        r = subprocess.run(_uvx("--version"), capture_output=True, text=True, timeout=600)
    except (OSError, subprocess.TimeoutExpired) as e:
        return f"uvx unavailable: {e}"
    if r.returncode != 0 or r.stdout.strip() != VERSION:
        return f"fontbakery {VERSION} not installable: {(r.stderr.strip().splitlines() or ['?'])[-1]}"
    return None


def _uvx(*args: str) -> list[str]:
    withs = [a for p in PINS for a in ("--with", p)]
    return ["uvx", "--from", f"fontbakery=={VERSION}", *withs, "fontbakery", *args]


def run(woff2: Path) -> dict:
    """FontBakery's JSON report for one web font."""
    with tempfile.TemporaryDirectory() as tmp:
        ttf = Path(tmp) / f"{woff2.stem}.ttf"
        font = TTFont(woff2)
        font.flavor = None
        font.save(ttf)
        out = Path(tmp) / "report.json"
        # FontBakery globs its inputs: glob characters in the name must be escaped.
        cmd = _uvx(*PROFILE, "--json", str(out), glob.escape(str(ttf)))
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=1200)
        if not out.exists():  # exit 1 with a report just means a FAIL was found
            raise RuntimeError(f"fontbakery produced no report: {r.stderr.strip()[-500:]}")
        return json.loads(out.read_text())


def _stable(message: str) -> str:
    """One line; list items sorted, because FontBakery emits some lists in set order."""
    head, *items = [line.strip() for line in message.strip().splitlines() if line.strip()]
    return " ".join([head, *sorted(items)])


def summarize(raw: dict) -> dict:
    """Counts by status, and every FAIL and WARN as (check id, trimmed message), sorted."""
    counts, issues = {}, []
    for section in raw["sections"]:
        for check in section["checks"]:
            status = check["result"]
            counts[status] = counts.get(status, 0) + 1
            if status not in ("FAIL", "WARN"):
                continue
            cid = re.fullmatch(r"<FontBakeryCheck:(.+)>", check["key"][1]).group(1)
            msgs = sorted({_stable(l["message"]["message"]) for l in check["logs"] if l["status"] == status})
            text = " | ".join(msgs)
            issues.append({"check": cid, "status": status, "message": text[:MESSAGE_CHARS]})
    return {"counts": dict(sorted(counts.items())), "issues": sorted(issues, key=lambda i: (i["status"], i["check"]))}


def generate() -> dict:
    return {
        "fontbakery": VERSION,
        "pins": list(PINS),
        "profile": " ".join(PROFILE),
        "excluded_checks": [],
        "fonts": {key: {"file": path.name, **summarize(run(path))} for key, path in FONTS.items()},
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", type=Path, default=REPORT)
    args = ap.parse_args()
    reason = available()
    if reason:
        raise SystemExit(reason)
    rep = generate()
    args.out.write_text(json.dumps(rep, indent=2, ensure_ascii=False) + "\n")
    for key, font in rep["fonts"].items():
        print(key, font["counts"])


if __name__ == "__main__":
    main()
