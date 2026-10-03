"""Weight-aware display tracking tokens (phase A.2, step 14; re-anchored and extended in A.5).

Usage: uv run python tools/tracking.py [--font dist/web/...] [--out dist/web/tokens.css]
       [--report dist/spacing-report.json]

How tracking changes with weight is measured from the built Latin font, not typed: for "n" (and
"H" for capitals) at a given weight, the scan line through half the x-height (a quarter of cap
height for "H", below its bar) gives

  gap     = left + right sidebearing of the ink on that line (the white between two letters)
  counter = the white inside the letter on that line

Two models turn that into tracking; config picks one, the report shows both:
  sidebearing: track(w) = track(400) x gap(w) / gap(400)        (prototype 01)
  rhythm:      (gap(w) + track(w)) / counter(w) = the same ratio at weight 400

Size ladder (A.5, decision 4): the anchors are what apps/www ships, each [size, weight, em]. Each
is back-solved to weight 400 with the chosen model, and the 400 ladder log-interpolates between
them, so the token at an anchor's (size, weight) reproduces the live value. A larger size that
comes out looser at 400 is reported as a reversal, never smoothed.

Caps (A.5, decision 3): from spacing.caps.from_px up, capitals keep the lowercase word-to-letter
white ratio. CSS letter-spacing is added after every character, the space included, so between
two words the white is space + 2t + gap and between two letters it is gap + t:
  R   = (space + 2t + gap_n) / (gap_n + t)          lowercase, t = lowercase tracking
  t_c : (space + 2t_c + gap_H) / (gap_H + t_c) = R  =>  t_c = (space + gap_H (1 - R)) / (R - 2)

Hero Arabic weight (A.5, decision 5): --weight-ar-display-light is the weight tools/pairing.py
chose from browser measurements (proofs/a5/pairing.json); this file only checks the report is
current and derives the token from it.

Arabic tracking is a fixed config value (0): letter-spacing breaks joined script.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.ttLib import TTFont

import pairing
from config import ROOT, Config, load

LATIN_FONT = ROOT / "dist" / "web" / "AltruvexSansLatin-VF.woff2"
TOKENS = ROOT / "dist" / "web" / "tokens.css"
REPORT = ROOT / "dist" / "spacing-report.json"


def _runs(glyphset, name: str, y: float, adv: float) -> list[tuple[int, int]]:
    """Ink runs [start, end) along the horizontal line y, at one font unit resolution."""
    runs, start = [], None
    for x in range(-50, int(adv) + 51):
        pen = PointInsidePen(glyphset, (x + 0.5, y))
        glyphset[name].draw(pen)
        inside = pen.getResult()
        if inside and start is None:
            start = x
        elif not inside and start is not None:
            runs.append((start, x))
            start = None
    return runs


def profile(font: TTFont, char: str, weight: int, y: float) -> dict[str, float]:
    """gap, counter, stem and advance of a two-stem letter at one weight, in em."""
    upm = font["head"].unitsPerEm
    gs = font.getGlyphSet(location={"wght": weight})
    name = font.getBestCmap()[ord(char)]
    adv = gs[name].width
    runs = _runs(gs, name, y, adv)
    if len(runs) < 2:
        raise ValueError(f"{char!r} at {weight}: expected two stems on y={y}, got {runs}")
    return {
        "gap": round((runs[0][0] + adv - runs[-1][1]) / upm, 4),
        "counter": round((runs[1][0] - runs[0][1]) / upm, 4),
        "stem": round((runs[0][1] - runs[0][0]) / upm, 4),
        "advance": round(adv / upm, 4),
    }


def measure_weights(font: TTFont, weights: list[int]) -> dict[int, dict[str, dict[str, float]]]:
    os2 = font["OS/2"]
    return {w: {"n": profile(font, "n", w, os2.sxHeight / 2),
                "H": profile(font, "H", w, os2.sCapHeight / 4)} for w in weights}


def space_advance(font: TTFont, weight: int) -> float:
    gs = font.getGlyphSet(location={"wght": weight})
    return round(gs[font.getBestCmap()[0x20]].width / font["head"].unitsPerEm, 4)


def ladder(px: float, anchors: list[tuple[int, float]]) -> float:
    """Tracking at weight 400, interpolated on log(px) and held flat beyond the ends."""
    pts = sorted(anchors)
    if px <= pts[0][0]:
        return pts[0][1]
    if px >= pts[-1][0]:
        return pts[-1][1]
    for (a, ta), (b, tb) in zip(pts, pts[1:]):
        if a <= px <= b:
            t = (math.log(px) - math.log(a)) / (math.log(b) - math.log(a))
            return ta + t * (tb - ta)
    raise AssertionError


def from_400(t400: float, w: int, model: str, table: dict, glyph: str = "n") -> float:
    base, cur = table[400][glyph], table[w][glyph]
    if model == "sidebearing":
        return t400 * cur["gap"] / base["gap"]
    if model == "rhythm":
        return (base["gap"] + t400) / base["counter"] * cur["counter"] - cur["gap"]
    raise ValueError(model)


def to_400(t: float, w: int, model: str, table: dict, glyph: str = "n") -> float:
    """Inverse of from_400: the weight-400 tracking that gives t at weight w."""
    base, cur = table[400][glyph], table[w][glyph]
    if model == "sidebearing":
        return t * base["gap"] / cur["gap"]
    if model == "rhythm":
        return (t + cur["gap"]) / cur["counter"] * base["counter"] - base["gap"]
    raise ValueError(model)


def track(px: float, w: int, model: str, table: dict, anchors: list[tuple[int, float]],
          glyph: str = "n") -> float:
    return from_400(ladder(px, anchors), w, model, table, glyph)


def back_solve(anchors: list, model: str, table: dict) -> list[tuple[int, float]]:
    """Live [size, weight, em, source] anchors -> [(size, tracking at 400)]."""
    return [(px, to_400(em, w, model, table)) for px, w, em, _ in anchors]


def reversals(ladder_400: list[tuple[int, float]]) -> list[dict]:
    """Adjacent anchors where the larger size is not tighter at 400 (tracking must fall with size)."""
    pts = sorted(ladder_400)
    return [{"from_px": a, "to_px": b, "from_em": round(ta, 4), "to_em": round(tb, 4)}
            for (a, ta), (b, tb) in zip(pts, pts[1:]) if tb >= ta]


def rhythm(gap: float, counter: float, t: float) -> float:
    return (gap + t) / counter


def word_ratio(space: float, gap: float, t: float) -> float:
    """White between two words over white between two letters, with tracking t on every character."""
    return (space + 2 * t + gap) / (gap + t)


def caps_word_spacing(space: float, gap_h: float, t: float, r: float) -> float:
    """CSS word-spacing that gives capitals at tracking t the word ratio r."""
    return r * (gap_h + t) - space - 2 * t - gap_h


def caps_track(space: float, gap_h: float, r: float) -> float:
    """Capital tracking whose word_ratio equals r."""
    if r <= 2:
        raise ValueError(f"word ratio {r} <= 2: no caps tracking keeps it")
    return (space + gap_h * (1 - r)) / (r - 2)


def snap(v: float, step: float) -> float:
    return round(round(v / step) * step, 4) + 0.0  # + 0.0 turns -0.0 into 0.0


def buckets_for(sizes: list[int], weights: list[int], exact: dict[str, float], gap: dict[int, float],
                tol: float) -> tuple[list[list[int]], dict[str, float], list[float]]:
    """Minimum size buckets: grow each while one snapped value per weight stays within tol x gap
    of the exact value at every size it covers. The value is halfway between the bucket's ends
    (tracking is monotonic in size between anchors)."""
    def fit(group: list[int], w: int) -> float:
        return snap((exact[f"{w}/{group[0]}"] + exact[f"{w}/{group[-1]}"]) / 2, 0.001)

    def worst(group: list[int]) -> float:
        return max(abs(exact[f"{w}/{px}"] - fit(group, w)) / gap[w] for w in weights for px in group)

    groups: list[list[int]] = []
    for px in sizes:
        if groups and worst(groups[-1] + [px]) <= tol:
            groups[-1].append(px)
        else:
            groups.append([px])
    cells = {f"{w}/{g[0]}": fit(g, w) for g in groups for w in weights}
    return groups, cells, [round(worst(g), 3) for g in groups]


def covering(groups: list[list[int]], px: int) -> int:
    """The token size for px: the largest bucket start at or below it (tokens.css header rule)."""
    return max(g[0] for g in groups if g[0] <= px)


def pairing_token(cfg: Config) -> tuple[int, dict]:
    """The hero Arabic weight from proofs/a5/pairing.json, refusing a report that is stale."""
    rep = json.loads(pairing.REPORT.read_text())
    if rep["rule"] != pairing.spec(cfg):
        raise ValueError("proofs/a5/pairing.json was measured for another rule — run tools/pairing.py")
    if rep["fonts_sha256"] != pairing.font_hashes(cfg):
        raise ValueError("proofs/a5/pairing.json was measured on other fonts — run tools/pairing.py")
    chosen = pairing.choose(rep["engines"])
    if chosen != rep["chosen"]:
        raise ValueError("proofs/a5/pairing.json chosen weight does not follow from its measurements")
    return chosen["weight"], rep


def generate(cfg: Config, font: TTFont) -> tuple[str, dict]:
    sp = cfg.spacing
    weights = sorted(set(sp.weights) | {400})
    table = measure_weights(font, weights)
    anchors = back_solve(sp.ladder_anchors, sp.weight_model, table)
    gap_n = {w: table[w]["n"]["gap"] for w in weights}
    gap_h = {w: table[w]["H"]["gap"] for w in weights}

    exact, models, case = {}, {}, {}
    for w in sp.weights:
        for px in sp.sizes:
            key = f"{w}/{px}"
            m = {name: round(from_400(ladder(px, back_solve(sp.ladder_anchors, name, table)), w, name, table), 4)
                 for name in ("sidebearing", "rhythm")}
            models[key] = m
            exact[key] = t = m[sp.weight_model]
            n, h = table[w]["n"], table[w]["H"]
            case[key] = {"n": round(rhythm(n["gap"], n["counter"], t), 3),
                         "H": round(rhythm(h["gap"], h["counter"], t), 3)}

    buckets, cells, worst = buckets_for(sp.sizes, sp.weights, exact, gap_n, sp.bucket_gap_fraction)

    # Live anchors against the tokens that cover them.
    live = []
    for px, w, em, source in sp.ladder_anchors:
        size = covering(buckets, px)
        tok = cells[f"{w}/{size}"]
        live.append({"px": px, "weight": w, "live_em": em, "source": source, "token": f"--track-{size}-{w}",
                     "token_em": tok, "gap_fraction": round(abs(tok - em) / gap_n[w], 4)})

    # Caps: keep the lowercase word-to-letter white ratio.
    caps_sizes = [px for px in sp.sizes if px >= sp.caps.from_px]
    space = {w: space_advance(font, w) for w in sp.weights}
    caps_exact, caps_rows = {}, {}
    for w in sp.weights:
        for px in caps_sizes:
            t = exact[f"{w}/{px}"]
            r = word_ratio(space[w], gap_n[w], t)
            tc = caps_track(space[w], gap_h[w], r)
            ws = caps_word_spacing(space[w], gap_h[w], t, r)
            caps_exact[f"{w}/{px}"] = round(tc if sp.caps.lever == "letter_spacing" else ws, 4)
            caps_rows[f"{w}/{px}"] = {
                "space": space[w], "gap_n": gap_n[w], "gap_H": gap_h[w], "t_lower": t,
                "ratio_lower": round(r, 3), "ratio_caps_at_t_lower": round(word_ratio(space[w], gap_h[w], t), 3),
                "t_caps": round(tc, 4), "ratio_caps_at_t_caps": round(word_ratio(space[w], gap_h[w], tc), 3),
                "word_spacing_caps": round(ws, 4),
                "ratio_caps_with_word_spacing": round((space[w] + ws + 2 * t + gap_h[w]) / (gap_h[w] + t), 3),
                "word_white_caps_em": {"at_t_lower": round(space[w] + 2 * t + gap_h[w], 4),
                                       "at_t_caps": round(space[w] + 2 * tc + gap_h[w], 4),
                                       "with_word_spacing": round(space[w] + ws + 2 * t + gap_h[w], 4)},
                "letter_white_caps_em": {"at_t_lower": round(gap_h[w] + t, 4), "at_t_caps": round(gap_h[w] + tc, 4)},
            }
    caps_buckets, caps_cells, caps_worst = (
        buckets_for(caps_sizes, sp.weights, caps_exact, gap_h, sp.bucket_gap_fraction) if caps_sizes else ([], {}, []))

    ar_weight, pair = pairing_token(cfg)

    caps_prefix = "--track-caps" if sp.caps.lever == "letter_spacing" else "--word-caps"
    caps_note = ([
        "   anchored on the live apps/www headings. All-caps text from the first --word-caps size up keeps",
        "   its --track token and adds word-spacing: var(--word-caps-<size>-<weight>), which keeps the",
        "   lowercase word-to-letter white ratio. Arabic is never tracked.",
    ] if sp.caps.lever == "word_spacing" else [
        "   anchored on the live apps/www headings. --track-caps-<size>-<weight> is the same for all-caps",
        "   text, keeping the lowercase word-to-letter white ratio. Arabic is never tracked.",
    ])
    lines = [
        "/* Altruvex Sans (Track A) spacing tokens. Generated by tools/tracking.py from",
        "   config/font.yaml, the built Latin font and proofs/a5/pairing.json. Do not edit by hand.",
        f"   Weight model: {sp.weight_model}. --track-<size>-<weight> covers font sizes from <size> up to",
        f"   the next token, within {sp.bucket_gap_fraction:.0%} of the letter gap of the exact value; the ladder is",
        *caps_note,
        "   --weight-ar-display-light: Arabic weight beside a light (300) Latin display, by ink density. */",
        ":root {",
    ]
    for group in buckets:
        for w in sp.weights:
            lines.append(f"  --track-{group[0]}-{w}: {cells[f'{w}/{group[0]}']}em;")
    for group in caps_buckets:
        for w in sp.weights:
            lines.append(f"  {caps_prefix}-{group[0]}-{w}: {caps_cells[f'{w}/{group[0]}']}em;")
    lines += [
        f"  --track-ar: {sp.arabic_tracking_em:g};",
        f"  --lh-display-latin: {sp.line_height.display_latin};",
        f"  --lh-heading-ar: {sp.line_height.heading_ar};",
        f"  --lh-vocalised: {sp.line_height.vocalised};",
        f"  --weight-ar-display-light: {ar_weight};",
        "}",
    ]
    css = "\n".join(lines) + "\n"

    report = {
        "weight_model": sp.weight_model,
        "bucket_gap_fraction": sp.bucket_gap_fraction,
        "ladder_anchors": [list(a) for a in sp.ladder_anchors],
        "ladder_400": [[px, round(t, 4)] for px, t in anchors],
        "ladder_reversals": reversals(anchors),
        "live_anchors": live,
        "latin_letter_white": {str(w): v for w, v in table.items()},
        "k_sidebearing": {str(w): round(table[w]["n"]["gap"] / table[400]["n"]["gap"], 3) for w in weights},
        "tracking_em": {"tokens": cells, "exact": exact, "models": models},
        "size_buckets": buckets,
        "worst_gap_fraction_per_bucket": worst,
        "case_rhythm": case,
        "caps": {"from_px": sp.caps.from_px, "lever": sp.caps.lever, "token_prefix": caps_prefix,
                 "rule": "(space + ws + 2t + gap) / (gap + t) equal for n (ws = 0) and H",
                 "measurements": caps_rows, "exact": caps_exact, "tokens": caps_cells,
                 "size_buckets": caps_buckets, "worst_gap_H_fraction_per_bucket": caps_worst},
        "pairing": {"source": "proofs/a5/pairing.json", "chosen": pair["chosen"],
                    "targets": {k: e["target"] for k, e in pair["engines"].items() if "not_run" not in e},
                    "argmin_per_engine": {k: e["argmin"] for k, e in pair["engines"].items() if "not_run" not in e}},
        "arabic_tracking_em": sp.arabic_tracking_em,
        "line_height": sp.line_height.model_dump(),
    }
    return css, report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--font", type=Path, default=LATIN_FONT)
    ap.add_argument("--out", type=Path, default=TOKENS)
    ap.add_argument("--report", type=Path, default=REPORT)
    a = ap.parse_args()
    css, rep = generate(load(), TTFont(a.font))
    a.out.write_text(css)
    a.report.write_text(json.dumps(rep, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    print(css)
    print("size buckets:", rep["size_buckets"], "worst:", rep["worst_gap_fraction_per_bucket"])
    print("ladder_400:", rep["ladder_400"], "reversals:", rep["ladder_reversals"])
    for a in rep["live_anchors"]:
        print(f"  live {a['px']}/{a['weight']} {a['live_em']} -> {a['token']} {a['token_em']} ({a['gap_fraction']:.1%} of gap)")


if __name__ == "__main__":
    main()
