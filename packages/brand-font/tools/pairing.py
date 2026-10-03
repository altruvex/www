"""Hero Arabic weight by rule (phase A.5, decision 5), and the A.5 render proofs.

Usage: uv run python tools/pairing.py            # measure, write proofs/a5/pairing.json, render PNGs
       uv run python tools/pairing.py --no-shots

The rule (config/font.yaml, pairing): in each engine, measure ink density (ink / (advance x font
size), the A.2 proof's measure) of the reference headings with Arabic at the Latin weight, and
their mean AR/EN ratio is the target. Then measure the hero's Arabic at every weight in
ar_weights against the hero's Latin weight. The chosen weight minimises |ratio - target|, averaged
over engines. tools/tracking.py reads the report and writes --weight-ar-display-light; it never
re-measures, so the report records the font hashes it was measured on and goes stale with them.

Renders (Seen by a person, not judged here), under proofs/a5/<engine>/:
  hero-ar-<w>.png   the hero line, EN at its live weight and tracking, AR at the current and chosen weight
  caps-<px>-<w>.png NOT ASSEMBLED at the A.4 token, the new lowercase token, the letter-spacing
                    ratio rule, and the shipped caps word-spacing
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re

from config import ROOT, Config, load

OUT = ROOT / "proofs" / "a5"
REPORT = OUT / "pairing.json"
BUILD_REPORT = ROOT / "dist" / "build-report.json"
TOKENS = ROOT / "dist" / "web" / "tokens.css"
SPACING_REPORT = ROOT / "dist" / "spacing-report.json"
A4_OPTICAL = ROOT / "proofs" / "a4" / "optical.json"
CURRENT_AR_HERO = 600  # apps/www hero-section.server.tsx:52 rtl:font-semibold — what the render compares against
CAPS_TEXT = {"lower": "not assembled", "caps": "NOT ASSEMBLED"}  # the A.4 proof's display copy


def font_hashes(cfg: Config) -> dict[str, str]:
    """SHA-256 of the built web fonts the measurement ran on (file names from config families)."""
    return {fam.output: hashlib.sha256((ROOT / "dist" / "web" / fam.output).read_bytes()).hexdigest()
            for fam in cfg.families.values()}


def spec(cfg: Config) -> dict:
    p = cfg.pairing
    return {"hero": p.hero.model_dump(), "references": [r.model_dump() for r in p.references],
            "ar_weights": list(range(p.ar_weights.start, p.ar_weights.stop + 1, p.ar_weights.step))}


def drawn(w: int) -> float:
    """Drawn Vazirmatn weight for a requested one, from the build's avar pairs (linear in between)."""
    pairs = json.loads(BUILD_REPORT.read_text())["weights"]["arabic_avar_pairs"]
    pts = sorted({(100, 100), (400, 400), (900, 900), *map(tuple, pairs)})
    for (a, da), (b, db) in zip(pts, pts[1:]):
        if a <= w <= b:
            return round(da + (w - a) / (b - a) * (db - da), 1)
    raise ValueError(w)


def score(engine: dict) -> dict:
    """Target = mean reference ratio; distance of each hero row from it."""
    target = sum(r["ratio"] for r in engine["references"]) / len(engine["references"])
    engine["target"] = round(target, 4)
    for row in engine["hero"]["rows"]:
        row["distance"] = round(abs(row["ratio"] - target), 4)
    engine["argmin"] = min(engine["hero"]["rows"], key=lambda r: (r["distance"], r["weight"]))["weight"]
    return engine


def choose(engines: dict) -> dict:
    """The weight with the smallest distance averaged over the engines that ran (ties: lighter)."""
    ran = [e for e in engines.values() if "not_run" not in e]
    if not ran:
        raise RuntimeError("no engine ran")
    weights = [r["weight"] for r in ran[0]["hero"]["rows"]]
    mean = {w: round(sum(next(r["distance"] for r in e["hero"]["rows"] if r["weight"] == w) for e in ran) / len(ran), 4)
            for w in weights}
    best = min(weights, key=lambda w: (mean[w], w))
    return {"weight": best, "drawn": drawn(best), "mean_distance": {str(w): d for w, d in mean.items()}}


def collect(cfg: Config) -> dict:
    from browser import engines, open_page, serve
    s = spec(cfg)
    result: dict = {}
    with serve() as base, engines(tuple(cfg.pairing.engines)) as launched:
        for name, browser, error in launched:
            if browser is None:
                result[name] = {"not_run": error}
                continue
            page = open_page(browser, base + "a5/pairing.html", width=1800)
            data = page.evaluate("s => window.measure(s)", s)
            data["version"] = browser.version
            for row in data["hero"]["rows"]:
                row["drawn"] = drawn(row["weight"])
            result[name] = score(data)
            page.close()
    return result


def report(cfg: Config, engines: dict) -> dict:
    return {"rule": spec(cfg), "fonts_sha256": font_hashes(cfg), "engines": engines, "chosen": choose(engines)}


def _caps_blocks(cfg: Config) -> list[dict]:
    tokens = dict(re.findall(r"^\s*(--[\w-]+):\s*([^;\n]+);", TOKENS.read_text(), re.M))
    spacing = json.loads(SPACING_REPORT.read_text())
    a4 = json.loads(A4_OPTICAL.read_text())
    a4_engine = next(v for v in a4.values() if "not_run" not in v)
    sizes = sorted({int(m.group(1)) for k in tokens if (m := re.match(r"--track-(\d+)-", k))})
    word = sorted({int(m.group(1)) for k in tokens if (m := re.match(r"--word-caps-(\d+)-", k))})
    blocks = []
    w = 700  # the weight the word space vanished at in proofs/a4 (d-120-700, d-136-700)
    for px in [px for px in cfg.spacing.sizes if px >= cfg.spacing.caps.from_px]:
        low = f"--track-{max(s for s in sizes if s <= px)}-{w}"
        old = next(ln for b in a4_engine["blocks"] if b["id"] == f"d-{px}-{w}" for ln in b["lines"] if ln["line"] == "caps")
        tc = spacing["caps"]["measurements"][f"{w}/{px}"]["t_caps"]
        lines = [
            {"text": CAPS_TEXT["lower"], "tracking": f"var({low})", "label": f"lowercase, {low} (new)"},
            {"text": CAPS_TEXT["caps"], "tracking": f"{old['tracking_em']}em", "label": f"caps, A.4 {old['tracking_token']} (old)"},
            {"text": CAPS_TEXT["caps"], "tracking": f"var({low})", "label": f"caps, {low} (new lowercase token)"},
            {"text": CAPS_TEXT["caps"], "tracking": f"{tc}em", "label": "caps, letter-spacing ratio rule (not shipped)"},
        ]
        if word:
            ws = f"--word-caps-{max(s for s in word if s <= px)}-{w}"
            lines.append({"text": CAPS_TEXT["caps"], "tracking": f"var({low})", "wordSpacing": f"var({ws})",
                          "label": f"caps, {low} + {ws} (shipped)"})
        blocks.append({"id": f"caps-{px}-{w}", "px": px, "weight": w, "lines": lines})
    return blocks


def render(cfg: Config, chosen: int) -> list[str]:
    from browser import engines, open_page, serve
    s = spec(cfg)
    live = next(a for a in cfg.spacing.ladder_anchors if (a[0], a[1]) == (cfg.pairing.hero.px, cfg.pairing.hero.weight))
    caps = _caps_blocks(cfg)
    saved = []
    with serve() as base, engines(tuple(cfg.pairing.engines)) as launched:
        for name, browser, error in launched:
            if browser is None:
                print(f"{name}: NOT RUN — {error}")
                continue
            d = OUT / name
            d.mkdir(parents=True, exist_ok=True)
            page = open_page(browser, base + "a5/pairing.html", width=2400)
            page.evaluate("([s, w, t]) => window.show(s, w, t)", [s, sorted({CURRENT_AR_HERO, chosen}), f"{live[2]}em"])
            page2 = open_page(browser, base + "a5/caps.html", width=1800)
            page2.evaluate("b => window.render(b)", caps)
            for p in (page, page2):
                for el in p.query_selector_all("[data-shot]"):
                    path = d / f"{el.get_attribute('data-shot')}.png"
                    el.screenshot(path=str(path))
                    saved.append(str(path.relative_to(ROOT)))
                p.close()
    return saved


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-shots", action="store_true")
    a = ap.parse_args()
    cfg = load()
    rep = report(cfg, collect(cfg))
    OUT.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(rep, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    for name, e in rep["engines"].items():
        if "not_run" in e:
            print(f"{name}: NOT RUN — {e['not_run']}")
            continue
        refs = " ".join(f"{r['role']} {r['ratio']:.3f}" for r in e["references"])
        print(f"{name} {e['version']}  refs {refs}  target {e['target']:.3f}  argmin {e['argmin']}")
        for r in e["hero"]["rows"]:
            print(f"  AR {r['weight']} (draws {r['drawn']}) ratio {r['ratio']:.3f} distance {r['distance']:.3f}")
    print("chosen:", rep["chosen"]["weight"])
    if not a.no_shots:
        for p in render(cfg, rep["chosen"]["weight"]):
            print(p)


if __name__ == "__main__":
    main()
