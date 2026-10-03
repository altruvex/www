"""Static OG instances (dist/og): Satori cannot read a variable WOFF2, so the build instances the web
VF at the weights the share card uses. They must exist, rebuild byte-identically, match what is
committed, and draw the same advances HarfBuzz gives the VF at that weight."""
import io

import pytest
import uharfbuzz as hb
from fontTools.ttLib import TTFont

import build as build_mod
from config import ROOT

SAMPLES = {
    "latin": "Custom web development for multilingual B2B systems. ALTRUVEX altruvex.com 0123456789",
    "arabic": "تطوير مواقع ويب مخصصة للأنظمة متعددة اللغات الموجّهة للأعمال (القاهرة) «نص»",
}
# instancer rounds each interpolated advance and kerning value to an integer; HarfBuzz rounds the
# VF's at shaping time. One unit per glyph covers the two roundings, nothing more.
TOLERANCE_UNITS = 1

CASES = [(key, w) for key in SAMPLES for w in build_mod.OG_WEIGHTS]


def _og(cfg, out_dir, key, weight):
    return out_dir / "og" / build_mod.og_filename(cfg.families[key], weight)


def _shape(blob: bytes, text: str, weight: int | None) -> list[tuple[int, int]]:
    font = hb.Font(hb.Face(blob))
    if weight is not None:
        font.set_variations({"wght": weight})
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf)
    return [(i.codepoint, p.x_advance) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]


def _sfnt(path) -> bytes:
    f = TTFont(path)
    f.flavor = None  # woff2 -> sfnt bytes for HarfBuzz
    out = io.BytesIO()
    f.save(out)
    return out.getvalue()


@pytest.mark.parametrize("key,weight", CASES)
def test_instance_exists_and_is_static(cfg, built, key, weight):
    out, rep = built
    path = _og(cfg, out, key, weight)
    assert path.exists(), path
    font = TTFont(path)
    assert font.flavor is None and "glyf" in font  # plain TrueType, which Satori reads
    assert "fvar" not in font and "gvar" not in font and "HVAR" not in font
    assert font["OS/2"].usWeightClass == weight
    assert font["name"].getDebugName(1) == cfg.families[key].family
    assert rep["og"][key][path.name]["sha256"] == build_mod.sha256(path)


@pytest.fixture(scope="module")
def second_build(tmp_path_factory):
    out = tmp_path_factory.mktemp("og-build-b")
    build_mod.build(out, None)
    return out


@pytest.mark.parametrize("key,weight", CASES)
def test_instances_are_reproducible(cfg, built, second_build, key, weight):
    out_a, _ = built
    out_b = second_build
    assert _og(cfg, out_a, key, weight).read_bytes() == _og(cfg, out_b, key, weight).read_bytes()


@pytest.mark.parametrize("key,weight", CASES)
def test_committed_og_is_current(cfg, built, key, weight):
    out, _ = built
    shipped = ROOT / "dist" / "og" / build_mod.og_filename(cfg.families[key], weight)
    assert shipped.read_bytes() == _og(cfg, out, key, weight).read_bytes(), (
        f"{shipped.name} is stale — run tools/build.py")


@pytest.mark.parametrize("key,weight", CASES)
def test_advances_match_the_vf(cfg, built, key, weight):
    out, _ = built
    text = SAMPLES[key]
    vf = _shape(_sfnt(out / cfg.families[key].output), text, weight)
    static = _shape(_og(cfg, out, key, weight).read_bytes(), text, None)
    assert [g for g, _ in static] == [g for g, _ in vf], "different glyphs after shaping"
    diffs = [abs(a - b) for (_, a), (_, b) in zip(static, vf)]
    assert max(diffs) <= TOLERANCE_UNITS, (key, weight, max(diffs))
    assert abs(sum(a for _, a in static) - sum(a for _, a in vf)) <= TOLERANCE_UNITS * len(vf)
