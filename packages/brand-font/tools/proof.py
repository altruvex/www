"""Render proofs/a2-proof.html (weights, Arabic line height, tracking by case) in each engine.

Usage: uv run python tools/proof.py

Writes proofs/a2/proof.json (window.measure() per engine) and proofs/a2/proof/<engine>/*.png:
page.png plus one element screenshot per [data-shot] row. An engine that does not launch is
recorded as not run with its error, never as passed.
"""
from __future__ import annotations

import json
import shutil

from browser import engines, open_page, serve
from config import ROOT

OUT = ROOT / "proofs" / "a2"


def collect(shots: bool = True) -> dict:
    result: dict = {}
    with serve() as base, engines() as launched:
        for name, browser, error in launched:
            if browser is None:
                result[name] = {"not_run": error}
                continue
            page = open_page(browser, base + "a2-proof.html", width=1600)
            data = page.evaluate("window.measure()")
            data["version"] = browser.version
            result[name] = data
            if shots:
                d = OUT / "proof" / name
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
    (OUT / "proof.json").write_text(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    for name, r in result.items():
        if "not_run" in r:
            print(f"{name}: NOT RUN — {r['not_run']}")
            continue
        print(f"{name} {r['version']}")
        for row in r["weights"]:
            ratios = " ".join(f"{a['weight']}:{a['ratio']}" for a in row["ar"])
            print(f"  {row['role']:<30} {row['px']}px EN {row['en_weight']}  AR÷EN {ratios}")
        for row in r["lineHeights"]:
            print(f"  lh {row['lh']} w{row['weight']} {row['text']:<10} extremes {row['min_clearance_em']:+.3f}em "
                  f"contact gap {row['contact_gap_em']:+.3f}em overlap {row['overlap_px']}px "
                  f"overflow {row['overflow_top_em']:.3f}/{row['overflow_bottom_em']:.3f} dom lines {row['dom_lines']}")


if __name__ == "__main__":
    main()
