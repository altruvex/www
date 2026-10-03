"""Glyph integrity: the build passes, and the check catches every kind of tampering."""
import copy

import pytest
from fontTools.ttLib import TTFont

import build as build_mod
import integrity


def _inputs(cfg, built, key):
    out_dir, _ = built
    fam = cfg.families[key]
    src = cfg.sources[fam.source]
    upstream = TTFont(src.path(fam.source, "font"))
    ref = TTFont(src.path(fam.source, "font"))
    requested = None
    if fam.unicodes is not None:
        requested = build_mod.requested_unicodes(fam)
        build_mod.subset_font(ref, requested)
    glyph_map = ref.getGlyphOrder()
    k = fam.scale.k if fam.scale else 1.0
    tol = fam.scale.rounding_tolerance_units if fam.scale else 0.0
    return upstream, TTFont(out_dir / fam.output), glyph_map, k, tol, requested


@pytest.mark.parametrize("key", ["latin", "arabic"])
def test_build_passes(cfg, built, key):
    r = integrity.compare(*_inputs(cfg, built, key))
    assert r["ok"], r
    assert r["added"] == 0 and r["modified"] == 0 and not r["deleted_outside_subset"]


@pytest.mark.parametrize("key", ["latin", "arabic"])
def test_report_records_integrity(built, key):
    g = built[1]["glyphs"][key]
    assert g["ok"] and g["added"] == 0 and g["modified"] == 0


def _first_simple(font):
    glyf = font["glyf"]
    return next(n for n in font.getGlyphOrder()
                if glyf[n].numberOfContours > 0 and not glyf[n].isComposite())


@pytest.mark.parametrize("key", ["latin", "arabic"])
def test_moved_point_is_caught(cfg, built, key):
    up, out, gm, k, tol, req = _inputs(cfg, built, key)
    g = out["glyf"][_first_simple(out)]
    g.coordinates[0] = (g.coordinates[0][0] + 2, g.coordinates[0][1])
    r = integrity.compare(up, out, gm, k, tol, req)
    assert not r["ok"] and r["modified_detail"][0]["reason"] == "outline coordinates"


def test_changed_gvar_delta_is_caught(cfg, built):
    up, out, gm, k, tol, req = _inputs(cfg, built, "arabic")
    name, tvs = next((n, v) for n, v in out["gvar"].variations.items()
                     if v and any(c for c in v[0].coordinates))
    i = next(i for i, c in enumerate(tvs[0].coordinates) if c is not None)
    x, y = tvs[0].coordinates[i]
    tvs[0].coordinates[i] = (x, y + 3)
    r = integrity.compare(up, out, gm, k, tol, req)
    assert not r["ok"] and r["modified_detail"][0]["reason"] == "gvar deltas"


def test_added_glyph_is_caught(cfg, built):
    up, out, gm, k, tol, req = _inputs(cfg, built, "arabic")
    donor = _first_simple(out)
    out["gvar"].variations  # decompile before the glyph count changes
    order = out.getGlyphOrder() + ["extra"]
    out["glyf"].glyphs["extra"] = copy.deepcopy(out["glyf"][donor])
    out["hmtx"].metrics["extra"] = out["hmtx"][donor]
    out.setGlyphOrder(order)
    out["glyf"].glyphOrder = order
    r = integrity.compare(up, out, gm, k, tol, req)
    assert not r["ok"] and r["added"] == 1


def test_dropped_glyph_is_caught(cfg, built):
    up, out, gm, k, tol, req = _inputs(cfg, built, "arabic")
    # Pretend the subset lost the glyph for U+0020.
    space = up.getBestCmap()[0x20]
    r = integrity.compare(up, out, [g if g != space else "missing" for g in gm], k, tol, req)
    assert not r["ok"] and space in r["deleted_outside_subset"]


def test_wrong_scale_is_caught(cfg, built):
    up, out, gm, k, tol, req = _inputs(cfg, built, "arabic")
    r = integrity.compare(up, out, gm, 1.10, tol, req)
    assert not r["ok"] and r["modified"] > 0
