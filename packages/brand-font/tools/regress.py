"""Browser regressions for steps 21 (Arabic marks inside the Accent gradient) and 22 (number and
price glyphs), on proofs/a4-regress.html.

Usage: uv run python tools/regress.py

Step 21: each case is drawn as the real Accent, the same background-clip painting solid black, and
plain black ink. One screenshot per case goes back into the page, which counts pixels inked by the
plain copy that the clipped copy does not paint. Step 22: prices are resolved at run time from
@repo/pricing-schema through Bun and passed into the page, which formats them with Intl and returns
only the codepoints emitted; coverage comes from the dist/web cmaps. Prices never leave memory.

Writes proofs/a4/regress.json and, per engine, proofs/a4/regress/<engine>/<case>.png (the real
gradient). An engine that does not launch is recorded as not run, never as passed.
"""
from __future__ import annotations

import base64
import json
import shutil
import subprocess
import unicodedata

from browser import REPO, engines, open_page, serve
from config import ROOT
from matrix import KNOWN_ABSENT, _cmaps

PAGE = "a4-regress.html"
OUT = ROOT / "proofs" / "a4"
PROD_FAMILIES = {"Altruvex Sans Latin", "Altruvex Sans Arabic"}
# Stack order per locale: the first family that has a codepoint draws it.
ORDER = {"ar": ("arabic", "latin"), "en": ("latin", "arabic")}
FAMILY = {"arabic": "Altruvex Sans Arabic", "latin": "Altruvex Sans Latin"}

# Every amount the schema publishes, walked from resolvePricing(); the site's own strings from its
# views. Printed as JSON to stdout and parsed here, so no figure is ever written to disk.
_PRICES_JS = r"""
import * as P from "@repo/pricing-schema";
const r = P.resolvePricing();
const amounts = new Set();
const walk = (o, k) => {
  if (typeof o === "number") { if (/price|min|max|rate/i.test(k ?? "") && o >= 100) amounts.add(o); }
  else if (o && typeof o === "object") for (const [kk, v] of Object.entries(o)) walk(v, kk);
};
walk({ services: r.services, maintenance: r.maintenance, consulting: r.consulting, terms: r.terms });
const list = [...amounts].sort((a, b) => a - b);
const usd = list.map(P.egpToUsd);
const site = {};
for (const l of ["en", "ar"]) {
  const m = P.investmentMatrixView(l).rows.flatMap(row => row.cells.map(c => c.priceLabel));
  site[l] = [...Object.values(P.pricingTokens(l)), ...m,
    ...P.maintenanceViews(l).map(v => v.priceLabel),
    ...usd.map(a => P.formatMoney(a, l, "USD")),
    P.formatRange({ min: usd[0], max: usd.at(-1) }, l, "USD"),
    P.formatFrom(list[0], l)].filter(Boolean);
}
console.log(JSON.stringify({ amounts: list, usd,
  usdRaw: list.map(a => a / P.USD_EXCHANGE_RATE.egpPerUsd),
  vat: r.terms.vatRate, site }));
"""


def prices() -> dict:
    run = subprocess.run(["bun", "-e", _PRICES_JS], cwd=REPO, capture_output=True, text=True, check=True)
    return json.loads(run.stdout)


def _platform_fonts(page, selectors: dict[str, str]) -> dict[str, list[dict]]:
    """CSS.getPlatformFontsForNode per selector (Chromium only, supplementary evidence)."""
    cdp = page.context.new_cdp_session(page)
    cdp.send("DOM.enable")
    cdp.send("CSS.enable")
    root = cdp.send("DOM.getDocument", {"depth": -1})["root"]["nodeId"]
    out = {}
    for key, sel in selectors.items():
        node = cdp.send("DOM.querySelector", {"nodeId": root, "selector": sel})["nodeId"]
        fonts = cdp.send("CSS.getPlatformFontsForNode", {"nodeId": node})["fonts"]
        out[key] = [{"family": f["familyName"], "custom": f["isCustomFont"], "glyphs": f["glyphCount"]}
                    for f in fonts]
    cdp.detach()
    return out


def classify(loc: str, cps: dict, cmaps: dict[str, set[int]]) -> None:
    """Adds the covering family to each codepoint, or a verdict when neither family has it."""
    for key, v in cps.items():
        c = int(key[2:], 16)
        fam = next((f for f in ORDER[loc] if c in cmaps[f]), None)
        v["family"] = FAMILY[fam] if fam else None
        v["name"] = unicodedata.name(chr(c), "")
        if fam is None:
            # An invisible format control is acceptable only when it draws nothing and takes no room.
            ok = unicodedata.category(chr(c)) == "Cf" and v["advance_em"] == 0 and v["ink_px"] == 0
            v["uncovered"] = "invisible control, zero advance, no ink" if ok else "FAIL"


def collect(shots: bool = True) -> dict:
    cmaps = _cmaps()
    data = prices()
    result = {
        "page": f"proofs/{PAGE}",
        "methods": {
            "clipped_px": "device pixels (scale 2) at least half inked in the plain copy where the black "
                          "background-clip copy paints under a quarter of that darkness AND no pixel within "
                          "one device pixel of it does (a run rastered one pixel over is not a clip)",
            "clipped_strict_px": "the same without the one-pixel neighbourhood; informational",
            "layout": "heading height, line count and the Accent's text line tops with the Accent as it was "
                      "(class nofix: no padding, no margin) and as it is, per display and width",
            "ink_below_box_em": "plain ink below the Accent's own box (its background painting area)",
            "coverage": "dist/web cmaps; ar stack Arabic then Latin, en stack Latin then Arabic",
            "advance_em/ink_px": "canvas, prod stack of the locale, weight 400, 100px, character alone",
            "fallback_differs": "width with the prod families then monospace vs then serif differs",
            "platform_fonts": "Chromium only: CDP CSS.getPlatformFontsForNode",
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
            cases = page.evaluate("window.ready")
            d = OUT / "regress" / name
            if shots:
                shutil.rmtree(d, ignore_errors=True)
                d.mkdir(parents=True)
            for c in cases:
                row = page.locator(f"#c-{c['id']}")
                png = base64.b64encode(row.screenshot()).decode()
                c.update(page.evaluate("([id, b]) => window.clipped(id, b)", [c["id"], png]))
                if shots and c["stack"].startswith("prod"):  # live is reference: numbers only
                    row.locator(".v-real").screenshot(path=str(d / f"{c['id']}.png"))
            layout = page.evaluate("window.layout()")
            numbers = page.evaluate("(d) => window.numbers(d)", data)
            for loc, n in numbers.items():
                classify(loc, n["codepoints"], cmaps)
            if name == "chromium":
                fonts = _platform_fonts(page, {c["id"]: f"#c-{c['id']} .v-real span" for c in cases})
                for c in cases:
                    c["platform_fonts"] = fonts[c["id"]]
                for loc, n in numbers.items():
                    n["platform_fonts"] = _platform_fonts(
                        page, {k: f'[data-num="{loc}-{k}"]' for k in n["kinds"]})
            page.close()
            result["engines"][name] = {"version": browser.version, "accent": cases, "layout": layout,
                                       "numbers": numbers}
    return result


def main() -> None:
    result = collect()
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "regress.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    for name, e in result["engines"].items():
        if "not_run" in e:
            print(f"{name}: NOT RUN — {e['not_run']}")
            continue
        worst = {}
        for c in e["accent"]:
            worst[c["stack"]] = max(worst.get(c["stack"], 0), c["clipped_px"])
        print(f"{name} {e['version']}: max clipped px per stack {worst}")
        moved = [r["id"] for r in e["layout"] if r["before"] != r["after"]]
        print(f"  layout: {len(e['layout'])} headings, moved by the fix: {moved or 'none'}")
        for loc, n in e["numbers"].items():
            gaps = {k: v["uncovered"] for k, v in n["codepoints"].items() if v["family"] is None}
            print(f"  {loc}: {len(n['codepoints'])} codepoints, uncovered {gaps or 'none'}")
    print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
