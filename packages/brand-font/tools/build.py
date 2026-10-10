"""Deterministic build of Altruvex Sans (Track A) web fonts.

Usage: uv run python tools/build.py [--out dist/web] [--og dist/og] [--report dist/build-report.json]

Inputs are only the pinned sources and config/font.yaml. The same inputs give byte-identical
outputs: head.modified is fixed from the config, and nothing else in the pipeline reads the clock.
"""
from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem
from fontTools.varLib import instancer

import glyph_edits
import integrity
import licensing
import measure
from config import ROOT, Config, Family, Weight, load
from fetch import verify_sources

EPOCH_1904 = 2082844800  # seconds between 1904-01-01 (OpenType epoch) and 1970-01-01
RENAMED_FAMILY_IDS = (1, 4, 16)
RENAMED_PS_IDS = (6, 25)
PACKER = {"fontTools.ttLib.tables.otBase:USE_HARFBUZZ_REPACKER": False}
# Static instances for renderers that cannot read a variable WOFF2: Satori (next/og) takes
# TTF/OTF/WOFF only and ignores variation axes. These are the weights
# apps/www/app/[locale]/opengraph-image.tsx sets; add one here before the card uses it.
OG_WEIGHTS = (400, 700)


def ot_timestamp(iso: str) -> int:
    dt = datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")
    return calendar.timegm(dt.timetuple()) + EPOCH_1904


def parse_unicodes(ranges: list[str]) -> set[int]:
    return set(subset.parse_unicodes(",".join(ranges)))


def requested_unicodes(fam: Family) -> set[int]:
    return parse_unicodes(fam.unicodes + fam.required_unicodes)


def subset_font(font: TTFont, unicodes: set[int], features: list[str] | None = None) -> None:
    """Keep the requested codepoints, every glyph they reach through GSUB, the layout features
    asked for (all when None) and all names. Glyphs are removed, never added or changed."""
    opts = subset.Options()
    opts.layout_features = features if features is not None else ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    s = subset.Subsetter(opts)
    s.populate(unicodes=unicodes)
    s.subset(font)


def _interp(points: list[tuple[float, float]], x: float) -> float:
    """Piecewise-linear map through sorted (x, y) points, held flat beyond the ends."""
    if x <= points[0][0]:
        return points[0][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x <= x1:
            return y0 + (x - x0) * (y1 - y0) / (x1 - x0)
    return points[-1][1]


def weight_pairs(weights: dict[str, Weight]) -> list[tuple[int, int]]:
    """Requested -> drawn user weights from config: each chosen value, plus the step below the
    lowest remapped weight held at itself, so everything up to it stays unchanged."""
    pairs = [(int(w), v.chosen) for w, v in weights.items() if v.chosen is not None]
    if pairs:
        low = min(w for w, _ in pairs) - 100
        pairs.append((low, low))
    return sorted(pairs)


def remap_weight(font: TTFont, pairs: list[tuple[int, int]]) -> None:
    """Compose a requested -> drawn weight map into the font's avar (wght segment map).

    Only the axis mapping changes: outlines and deltas stay the source's, so a requested weight
    draws the source's design at the drawn weight. The composition is exact at every breakpoint
    of either map; stored values round to F2Dot14 (1/16384) on save."""
    axis = next(a for a in font["fvar"].axes if a.axisTag == "wght")
    lo, df, hi = axis.minValue, axis.defaultValue, axis.maxValue

    def norm(u: float) -> float:
        return (u - df) / (hi - df) if u >= df else (u - df) / (df - lo)

    old = sorted(font["avar"].segments["wght"].items())
    remap = sorted({(-1.0, -1.0), (0.0, 0.0), (1.0, 1.0)} | {(norm(a), norm(b)) for a, b in pairs})
    inverse = [(y, x) for x, y in remap]
    xs = {x for x, _ in remap} | {_interp(inverse, x) for x, _ in old}
    # avar stores F2Dot14: breakpoints that meet after rounding (500 lands on 0.2, next to
    # Vazirmatn's own 0.20001) must become one key, or the map is out of order and OTS, the
    # browsers' font sanitizer, discards the whole table.
    keys = sorted({round(x * 16384) / 16384 for x in xs})
    font["avar"].segments["wght"] = {x: _interp(old, _interp(remap, x)) for x in keys}


def rename(font: TTFont, fam: Family, version: str) -> None:
    """Replace the upstream family in the identifying name records; everything else, including
    the upstream copyright, designer and licence records, stays."""
    name = font["name"]
    old_family = (name.getDebugName(16) or name.getDebugName(1)).split()[0]
    old_ps = (name.getDebugName(25) or name.getDebugName(6)).split("-")[0]
    for rec in name.names:
        text = rec.toUnicode()
        if rec.nameID in RENAMED_FAMILY_IDS:
            text = text.replace(old_family, fam.family)
        elif rec.nameID in RENAMED_PS_IDS:
            text = text.replace(old_ps, fam.postscript)
        elif rec.nameID == 0:
            text = f"{text}. Modifications Copyright 2026 Altruvex."
        else:
            continue
        rec.string = text
    ps_name = name.getDebugName(6)
    for rec in name.names:
        if rec.nameID == 3:
            rec.string = f"{version};ALTRUVEX;{ps_name}"
    # Mac-platform (platformID 1) records duplicate the Windows ones and nothing reads them.
    name.removeNames(platformID=1)


def drop_opsz_axis_values(font: TTFont) -> None:
    """Inter's STAT names its opsz stops ("16pt", "32pt"), and "Altruvex Sans Latin 16pt ExtraBold"
    passes the 31-character limit some apps hold family + style to. The opsz axis record and its
    elidable default ("14pt", flag 2, never shown) stay; the named stops go, so the weight names
    are the only styles a menu builds."""
    if "STAT" not in font or "fvar" not in font:
        return
    stat = font["STAT"].table
    tags = [a.AxisTag for a in stat.DesignAxisRecord.Axis]
    if "opsz" not in tags or not stat.AxisValueArray:
        return
    opsz = tags.index("opsz")
    keep = [v for v in stat.AxisValueArray.AxisValue
            if (v.Flags & 2 or getattr(v, "AxisIndex", None) != opsz)
            and all(r.AxisIndex != opsz for r in getattr(v, "AxisValueRecord", []))]
    stat.AxisValueArray.AxisValue = keep
    stat.AxisValueCount = len(keep)


def save_woff2(font: TTFont, path: Path, timestamp: int) -> None:
    font["head"].modified = timestamp
    font.recalcTimestamp = False
    font.flavor = "woff2"
    path.parent.mkdir(parents=True, exist_ok=True)
    font.save(path)


def build_family(cfg: Config, key: str, out_dir: Path) -> tuple[Path, list[str]]:
    """Build one family. Returns the output path and the glyph map (source name per output GID)."""
    fam = cfg.families[key]
    src = cfg.sources[fam.source]
    # fontTools packs GSUB/GPOS with HarfBuzz's repacker whenever uharfbuzz is importable (a dev
    # dependency of the shaping tests), which gives different bytes. Pin the pure-Python packer so
    # the output depends on the inputs only, not on what else is installed.
    font = TTFont(src.path(fam.source, "font"), cfg=PACKER)
    if fam.unicodes is not None:
        subset_font(font, requested_unicodes(fam), fam.layout_features)
    glyph_map = font.getGlyphOrder()  # still the source's names; dropped only on save
    if key == "latin" and cfg.bar_widening:
        glyph_edits.widen_bars(font, cfg.bar_widening.percent)
    if fam.scale:
        sc = fam.scale
        if font["head"].unitsPerEm != sc.source_upm:
            raise SystemExit(f"{key}: source UPM {font['head'].unitsPerEm} != config {sc.source_upm}")
        scale_upem(font, int(sc.source_upm * sc.k))
        font["head"].unitsPerEm = sc.output_upm
    if key == "arabic" and (pairs := weight_pairs(cfg.weights)):
        remap_weight(font, pairs)
    if fam.unicodes is not None or fam.scale:
        font["OS/2"].recalcAvgCharWidth(font)  # the subset and the scale both change it
    drop_opsz_axis_values(font)
    rename(font, fam, cfg.build.version)
    path = out_dir / fam.output
    save_woff2(font, path, ot_timestamp(cfg.build.timestamp))
    return path, glyph_map


OG_OPSZ = 32


def og_filename(fam: Family, weight: int) -> str:
    return f"{fam.postscript}-{weight}.ttf"


def build_og(cfg: Config, key: str, vf_path: Path, og_dir: Path) -> list[Path]:
    """Static TTF instances of the VF that ships to the web, one per OG weight.

    Instanced from the built woff2 itself, not from the source, so an instance cannot drift from
    what the browser draws: the Arabic avar remap applies (a requested 700 draws Vazirmatn 830),
    and outlines, advances and kerning are the VF's at that location, rounded to integers."""
    fam = cfg.families[key]
    paths = []
    for weight in OG_WEIGHTS:
        vf = TTFont(vf_path, cfg=PACKER)
        if any(a.axisTag == "opsz" for a in vf["fvar"].axes):
            # OG cards are headline text: the display cut. Pinned on its own first because Inter's
            # STAT names no opsz 32 value, which updateFontNames would refuse.
            vf = instancer.instantiateVariableFont(vf, {"opsz": OG_OPSZ})
        font = instancer.instantiateVariableFont(vf, {"wght": weight}, updateFontNames=True)
        font["head"].modified = ot_timestamp(cfg.build.timestamp)
        font.recalcTimestamp = False
        font.flavor = None
        path = og_dir / og_filename(fam, weight)
        path.parent.mkdir(parents=True, exist_ok=True)
        font.save(path)
        paths.append(path)
    return paths


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _read_report(rel: str) -> dict | None:
    p = ROOT / rel
    return json.loads(p.read_text()) if p.exists() else None


def _harfbuzz(d: dict) -> dict:
    return {"pass": d["pass"], "target_em": d["target_em"], "samples": len(d["samples"]),
            "pairs": {w: {k: (len(v[k]) if k == "over_target" else v[k])
                          for k in ("max_overlap_em", "over_target", "notdef", "pass")}
                      for w, v in d["pairs"].items()}}


def _fontbakery(d: dict) -> dict:
    return {"version": d["fontbakery"], "profile": d["profile"],
            "counts": {k: v["counts"] for k, v in d["fonts"].items()},
            "fail": sum(v["counts"].get("FAIL", 0) for v in d["fonts"].values())}


def _engines(d: dict, summarize) -> dict:
    return {name: ({"not_run": e["not_run"]} if "not_run" in e else summarize(e))
            for name, e in d["engines"].items()}


def _matrix(d: dict) -> dict:
    def one(e: dict) -> dict:
        prod = [c["stacks"]["prod"] for c in e["cases"]]
        return {"version": e["version"], "cases": len(e["cases"]),
                "bidi_pass": sum(1 for p in prod if p["bidi"]["pass"]),
                "coverage_none": sorted({cp for c in e["cases"] for cp in c["coverage_none"]}),
                "fonts_loaded": sum(1 for f in e["fonts"] if f["status"] == "loaded"),
                "fonts": len(e["fonts"])}
    return {"known_absent": sorted(d["known_absent"]), "engines": _engines(d, one)}


def _numbers(d: dict) -> dict:
    def one(e: dict) -> dict:
        out = {"version": e["version"]}
        for loc, n in sorted(e["numbers"].items()):
            cps = n["codepoints"].values()
            out[loc] = {"codepoints": len(cps), "kinds": len(n["kinds"]),
                        "no_brand_family": sum(1 for c in cps if c["family"] is None),
                        "fallback_differs": sum(1 for c in cps if c["fallback_differs"]),
                        "families": sorted({c["family"] for c in cps if c["family"]})}
        return out
    return {"engines": _engines(d, one)}


def _generic(d: dict) -> dict:
    """Reports another phase writes: carry their own verdict and summary, never invent one."""
    out = {k: d[k] for k in ("pass", "ok", "browser_ok", "summary", "counts") if k in d}
    if "engines" in d and isinstance(d["engines"], dict):
        out["engines"] = sorted(d["engines"])
    return out


# field -> (report path relative to the package, summarizer). A missing report leaves the field
# null with the reason in tests.not_run: null means not run, never passed.
TEST_REPORTS = {
    "harfbuzz": ("dist/harfbuzz-report.json", _harfbuzz),
    "fontbakery": ("dist/fontbakery-report.json", _fontbakery),
    "browser_matrix": ("proofs/a2/matrix.json", _matrix),
    "font_loading": ("dist/font-loading-report.json", _generic),
    "bidi": ("dist/bidi-report.json", _generic),
    "number_formatting": ("proofs/a4/regress.json", _numbers),
}


def aggregate_tests() -> dict:
    out: dict = {"not_run": {}}
    for field, (rel, summarize) in TEST_REPORTS.items():
        d = _read_report(rel)
        if d is None:
            out[field] = None
            out["not_run"][field] = f"{rel} not present"
        else:
            out[field] = {"report": rel, **summarize(d)}
    return out


def route_payload() -> dict:
    """Initial-route font KB per locale, from the apps/www measurement when it exists."""
    rel = "dist/payload-report.json"
    d = _read_report(rel)
    if d is None:
        return {"route_kb": {"en": None, "ar": None}, "route_kb_reason": f"{rel} not present"}
    src = d.get("route_kb", d)
    kb = {loc: (v.get("kb") if isinstance(v := src.get(loc), dict) else v) for loc in ("en", "ar")}
    return {"route_kb": kb, "route_kb_report": rel}


def build(out_dir: Path, report_path: Path | None, og_dir: Path | None = None) -> dict:
    """og_dir defaults to out_dir/og, so a build into a temp dir keeps both outputs together;
    the package build passes dist/og."""
    og_dir = og_dir if og_dir is not None else out_dir / "og"
    cfg = load()
    verify_sources(cfg)
    rep: dict = {"build": cfg.build.model_dump(), "source": {}, "license": {}, "glyphs": {},
                 "outputs": {}, "og": {}}
    for key, src in cfg.sources.items():
        rep["source"][key] = {
            "version": src.version,
            "upstream_repository": src.upstream_repository,
            "upstream_commit": src.upstream_commit,
            **{kind: {"url": f.url, "sha256": f.sha256} for kind, f in src.files.items()},
        }

    fonts: dict[str, TTFont] = {}
    for key, fam in cfg.families.items():
        path, glyph_map = build_family(cfg, key, out_dir)
        src = cfg.sources[fam.source]
        upstream = TTFont(src.path(fam.source, "font"))
        out = TTFont(path)
        fonts[key] = out
        requested = requested_unicodes(fam) if fam.unicodes is not None else None
        k = fam.scale.k if fam.scale else 1.0
        tol = fam.scale.rounding_tolerance_units if fam.scale else 0.0
        edited = set(glyph_edits.EDITED) if key == "latin" and cfg.bar_widening else set()
        rep["glyphs"][key] = g = integrity.compare(upstream, out, glyph_map, k, tol, requested, edited)
        if fam.unicodes is not None:
            cmap = out.getBestCmap()
            g["required_missing"] = [f"U+{c:04X}" for c in sorted(parse_unicodes(fam.required_unicodes))
                                     if c not in cmap]
            g["ok"] = g["ok"] and not g["required_missing"]
            g["absent_upstream_not_synthesized"] = [
                f"U+{c:04X}" for c in (0x061C,) if c not in upstream.getBestCmap()]
        rep["license"][key] = licensing.check(
            src.path(fam.source, "license").read_text(), upstream, out)
        rep["outputs"][key] = {
            "file": path.name,
            "family": fam.family,
            "bytes": path.stat().st_size,
            "kb": round(path.stat().st_size / 1024, 1),
            "sha256": sha256(path),
            "glyphs": len(out.getGlyphOrder()),
            "codepoints": len(out.getBestCmap()),
            "upm": out["head"].unitsPerEm,
        }
        rep["og"][key] = {p.name: {"bytes": p.stat().st_size, "sha256": sha256(p)}
                          for p in build_og(cfg, key, path, og_dir)}

    arabic_src = cfg.sources[cfg.families["arabic"].source]
    rep["metrics"] = measure.report(
        fonts["latin"], fonts["arabic"],
        TTFont(arabic_src.path(cfg.families["arabic"].source, "font")),
        cfg.families["arabic"].scale.k)
    rep["weights"] = {w: v.model_dump() for w, v in cfg.weights.items()}
    rep["weights"]["arabic_avar_pairs"] = weight_pairs(cfg.weights)
    rep["payload"] = {
        "latin_kb": rep["outputs"]["latin"]["kb"],
        "arabic_kb": rep["outputs"]["arabic"]["kb"],
        **route_payload(),
        "budgets": cfg.budgets.model_dump(),
    }
    rep["tests"] = {
        "glyph_integrity": all(g["ok"] for g in rep["glyphs"].values()),
        "license": all(v["ok"] for v in rep["license"].values()),
        **aggregate_tests(),
    }
    rep["ok"] = rep["tests"]["glyph_integrity"] and rep["tests"]["license"]
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(rep, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    return rep


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=ROOT / "dist" / "web")
    ap.add_argument("--og", type=Path, default=ROOT / "dist" / "og")
    ap.add_argument("--report", type=Path, default=ROOT / "dist" / "build-report.json")
    a = ap.parse_args()
    rep = build(a.out, a.report, a.og)
    for key, o in rep["outputs"].items():
        g = rep["glyphs"][key]
        print(f"{o['file']}: {o['kb']} KB, {o['glyphs']} glyphs, preserved {g['preserved']}, "
              f"added {g['added']}, modified {g['modified']}, sha256 {o['sha256'][:12]}")
    for key, files in rep["og"].items():
        for name, o in files.items():
            print(f"og/{name}: {round(o['bytes'] / 1024, 1)} KB, sha256 {o['sha256'][:12]}")
    route = rep["payload"]["route_kb"]
    print(f"Measured:\n  Latin {rep['payload']['latin_kb']} KB\n  Arabic {rep['payload']['arabic_kb']} KB\n"
          f"  Initial EN {route['en'] if route['en'] is not None else '—'} KB\n"
          f"  Initial AR {route['ar'] if route['ar'] is not None else '—'} KB")
    for field, reason in rep["tests"]["not_run"].items():
        print(f"{field}: not run ({reason})")
    print("glyph integrity:", "PASS" if rep["tests"]["glyph_integrity"] else "FAIL")
    print("OFL/RFN:", "PASS" if rep["tests"]["license"] else "FAIL")
    if not rep["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
