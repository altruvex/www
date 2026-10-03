"""Render proofs/a4-proof.html (optical relations, display tracking by case) in each engine.

Usage: uv run python tools/optical.py

Writes proofs/a4/optical.json (window.measure() per engine) and proofs/a4/optical/<engine>/*.png:
page.png plus one element screenshot per [data-shot] block. An engine that does not launch is
recorded as not run with its error, never as passed. The page states numbers only; Ali judges.
"""
from __future__ import annotations

import json
import shutil

from browser import engines, open_page, serve
from config import ROOT

OUT = ROOT / "proofs" / "a4"


def collect(shots: bool = True) -> dict:
    result: dict = {}
    with serve() as base, engines() as launched:
        for name, browser, error in launched:
            if browser is None:
                result[name] = {"not_run": error}
                continue
            page = open_page(browser, base + "a4-proof.html", width=1600)
            data = page.evaluate("window.measure()")
            data["version"] = browser.version
            result[name] = data
            if shots:
                d = OUT / "optical" / name
                shutil.rmtree(d, ignore_errors=True)
                d.mkdir(parents=True)
                for el in page.query_selector_all("[data-shot]"):
                    el.screenshot(path=str(d / f"{el.get_attribute('data-shot')}.png"))
                page.screenshot(path=str(d / "page.png"), full_page=True)
            page.close()
    return result


def main() -> None:
    result = collect()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "optical.json").write_text(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    for name, r in result.items():
        if "not_run" in r:
            print(f"{name}: NOT RUN — {r['not_run']}")
            continue
        print(f"{name} {r['version']}")
        for b in r["blocks"]:
            if b.get("kind") == "vertical":
                top = " ".join(f"{x['line']} {x['ink_top_em']:.3f}" for x in b["lines"])
                print(f"  {b['px']:>3}px ink top em: {top}  alef÷H {b['alef_over_H']} alef÷l {b['alef_over_l']}")
            elif b["section"] == "display":
                rs = " ".join(f"{k} {v:.3f}" for k, v in b["ratios"].items())
                print(f"  {b['id']:<10} AR÷EN {rs}")


if __name__ == "__main__":
    main()
