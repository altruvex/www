"""Subset coverage: the common characters Arabic text needs come from Vazirmatn itself, the
Latin file is the pinned Latin source cut to the configured coverage, and nothing absent upstream
appears."""
import pytest
from fontTools.ttLib import TTFont

ARABIC_COMMON = {
    0x0020: "space", 0x00A0: "no-break space", 0x2009: "thin space",
    0x202F: "narrow no-break space", 0x0028: "(", 0x0029: ")", 0x005B: "[", 0x005D: "]",
    0x00AB: "«", 0x00BB: "»",
}


def _fonts(cfg, built, key):
    fam = cfg.families[key]
    src = cfg.sources[fam.source]
    return TTFont(src.path(fam.source, "font")), TTFont(built[0] / fam.output)


@pytest.mark.parametrize("cp", sorted(ARABIC_COMMON))
def test_arabic_keeps_upstream_common_glyph(cfg, built, cp):
    up, out = _fonts(cfg, built, "arabic")
    assert cp in up.getBestCmap(), f"U+{cp:04X} is not in the pinned Vazirmatn"
    assert cp in out.getBestCmap(), f"U+{cp:04X} {ARABIC_COMMON[cp]} missing from the Arabic build"


def test_arabic_space_widths_are_vazirmatn_times_k(cfg, built):
    up, out = _fonts(cfg, built, "arabic")
    k = cfg.families["arabic"].scale.k
    for cp in (0x20, 0xA0, 0x2009, 0x202F):
        src_w = up["hmtx"][up.getBestCmap()[cp]][0]
        out_w = out["hmtx"][out.getBestCmap()[cp]][0]
        assert abs(out_w - src_w * k) <= 0.5, f"U+{cp:04X}"


def test_arabic_word_space_is_measured(built):
    ws = built[1]["metrics"]["word_space"]
    assert abs(ws["arabic_space_em"] - ws["arabic_reference_em"]) < 0.001


def test_u061c_is_not_synthesized(cfg, built):
    up, out = _fonts(cfg, built, "arabic")
    assert 0x061C not in up.getBestCmap()
    assert 0x061C not in out.getBestCmap()


def test_arabic_has_no_latin_letters(cfg, built):
    _, out = _fonts(cfg, built, "arabic")
    assert not any(0x41 <= c <= 0x7A for c in out.getBestCmap() if chr(c).isalpha())


def test_latin_cmap_is_source_cut_to_coverage(cfg, built):
    """Since 2026-10-10 the source is Inter, cut to Outfit's former coverage (config unicodes);
    every requested character Inter has is kept, nothing else is added. Glyph names are dropped
    on save, so code points are compared, not names."""
    from build import requested_unicodes

    up, out = _fonts(cfg, built, "latin")
    want = set(up.getBestCmap()) & set(requested_unicodes(cfg.families["latin"]))
    assert set(out.getBestCmap()) == want
    assert 0x2009 not in out.getBestCmap() and 0x202F not in out.getBestCmap()


def test_arabic_scale_hits_latin_ascender(built):
    m = built[1]["metrics"]
    assert m["scale"]["k_effective_alef"] == 1.0821
    assert abs(m["arabic"]["alef"] - m["latin"]["ascender_h"]) < 0.001
