"""Mixed RTL/LTR browser matrix (phase A.2): renders proofs/a2-matrix.html in each engine and
collects the page's own window.measure(). Adds cmap coverage from dist/web and, in Chromium only,
font attribution through CDP. Writes proofs/a2/matrix.json and element screenshots under
proofs/a2/matrix/<engine>/. Evidence for review; it changes nothing in the build."""
from __future__ import annotations

import json
from pathlib import Path

from fontTools.ttLib import TTFont

from browser import engines, open_page, serve
from config import ROOT, load

PAGE = "a2-matrix.html"
OUT = ROOT / "proofs" / "a2"
WEB = ROOT / "dist" / "web"

# Codepoints Vazirmatn lacks upstream. They stay absent; the build never adds them.
KNOWN_ABSENT = {"U+061C": "Arabic letter mark: not in Vazirmatn 33.003, never synthesized"}


def _cmaps() -> dict[str, set[int]]:
    fams = load().families
    return {key: set(TTFont(WEB / fams[key].output).getBestCmap()) for key in ("arabic", "latin")}


def coverage(text: str, cmaps: dict[str, set[int]]) -> list[dict]:
    """The family the prod-ar stack must resolve each codepoint to: Arabic first, then Latin."""
    out = []
    for ch in dict.fromkeys(text):
        c = ord(ch)
        fam = "arabic" if c in cmaps["arabic"] else "latin" if c in cmaps["latin"] else "none"
        out.append({"cp": f"U+{c:04X}", "char": ch, "family": fam})
    return out


def _platform_fonts(page, case_ids: list[str]) -> dict:
    """CSS.getPlatformFontsForNode for every visible cell (Chromium only, supplementary)."""
    cdp = page.context.new_cdp_session(page)
    cdp.send("DOM.enable")
    cdp.send("CSS.enable")
    root = cdp.send("DOM.getDocument", {"depth": -1})["root"]["nodeId"]
    out = {}
    for cid in case_ids:
        out[cid] = {}
        for stack in ("prod", "proto", "live"):
            node = cdp.send("DOM.querySelector", {"nodeId": root, "selector": f"#c{cid}-{stack} p"})["nodeId"]
            fonts = cdp.send("CSS.getPlatformFontsForNode", {"nodeId": node})["fonts"]
            out[cid][stack] = [{"family": f["familyName"], "postscript": f.get("postScriptName"),
                                "custom": f["isCustomFont"], "glyphs": f["glyphCount"]} for f in fonts]
    cdp.detach()
    return out


def collect(shots: Path | None = None) -> dict:
    """Runs the matrix in every engine. With shots, also writes screenshots under shots/<engine>/."""
    cmaps = _cmaps()
    result = {
        "page": f"proofs/{PAGE}",
        "stacks": {"prod": "--stack-prod-ar (under test)", "proto": "--stack-proto (reference)",
                   "live": "--stack-live-ar (reference)"},
        "methods": {
            "advance_em": "Range rect width over the whole text, nowrap copy at 1000px",
            "spaces": "Range rect width of each U+0020/U+00A0/U+2009/U+202F in the nowrap copy at 1000px; "
                      "context = script of the two neighbours (arabic, latin, mixed)",
            "lines": "per-character Range rects grouped by vertical centre; natural = nowrap copy, "
                     "narrow = 7em container; start = lowest logical index on each line",
            "ink": "canvas measureText actualBoundingBoxAscent/Descent with the element's computed font "
                   "(ctx.direction rtl), placed on the baseline of a zero-size inline-block probe; "
                   "outside = ink above the line box top plus ink below its bottom",
            "bidi": "Range rects over token text offsets (no spans), sorted by centre x = visual "
                    "left-to-right order, compared with the order expected from the Unicode Bidi Algorithm",
            "coverage": "dist/web cmaps via fontTools: arabic if in Altruvex Sans Arabic, else latin if "
                        "in Altruvex Sans Latin, else none",
            "platform_fonts": "Chromium only: CDP CSS.getPlatformFontsForNode on each visible cell",
        },
        "known_absent": KNOWN_ABSENT,
        "engines": {},
    }
    with serve() as base, engines() as it:
        for name, browser, err in it:
            if browser is None:
                result["engines"][name] = {"not_run": err}
                continue
            page = open_page(browser, base + PAGE, width=1600, height=1000)
            data = json.loads(page.evaluate("window.measure()"))
            ids = [c["id"] for c in data["cases"]]
            fonts = _platform_fonts(page, ids) if name == "chromium" else None
            for c in data["cases"]:
                c["coverage"] = coverage(c["text"], cmaps)
                c["coverage_none"] = [x["cp"] for x in c["coverage"] if x["family"] == "none"]
                if fonts is not None:
                    c["platform_fonts"] = fonts[c["id"]]
            if shots is not None:
                d = shots / name
                d.mkdir(parents=True, exist_ok=True)
                for c in data["cases"]:
                    page.locator(f"#c{c['id']}-prod").screenshot(path=str(d / f"{c['id']}-{c['slug']}.png"))
                page.screenshot(path=str(d / "page.png"), full_page=True)
            page.close()
            result["engines"][name] = {"version": browser.version, **data}
    return result


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    result = collect(OUT / "matrix")
    path = OUT / "matrix.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for name, e in result["engines"].items():
        if "not_run" in e:
            print(f"{name}: not run ({e['not_run']})")
            continue
        bad = [c["id"] for c in e["cases"] if not c["stacks"]["prod"]["bidi"]["pass"]]
        print(f"{name} {e['version']}: {len(e['cases'])} cases, prod bidi failures: {bad or 'none'}")
    print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
