"""Desktop statics (dist/desktop): installable TTFs for the proposal deck and contract, which name
their fonts and embed nothing. They must group into families the way applications expect, carry no
variable tables, rebuild byte-identically, and draw the same advances the web files draw."""
import hashlib
import io

import pytest
import uharfbuzz as hb
from fontTools.ttLib import TTFont

import desktop

SAMPLES = {
    "latin": "Proposal for Altruvex: scope, timeline and investment. 0123456789",
    "arabic": "تطوير مواقع ويب مخصصة للأنظمة متعددة اللغات الموجّهة للأعمال (القاهرة)",
}
TOLERANCE_UNITS = 1  # instancer and HarfBuzz round interpolated advances differently


@pytest.fixture(scope="module")
def desk(tmp_path_factory):
    if not (desktop.WEB / "AltruvexSansLatin-VF.woff2").exists():
        pytest.skip("dist/web not built; run build.py and italic.py first")
    out = tmp_path_factory.mktemp("desktop")
    report = desktop.build(out / "desktop", out / "desktop-report.json")
    return out / "desktop", report


def _name(f: TTFont, nid: int) -> str:
    return f["name"].getName(nid, 3, 1, 0x409).toUnicode()


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
    f.flavor = None
    out = io.BytesIO()
    f.save(out)
    return out.getvalue()


def test_the_twelve_files(desk):
    out, report = desk
    assert len(report["files"]) == 12
    for name, row in report["files"].items():
        data = (out / name).read_bytes()
        assert hashlib.sha256(data).hexdigest() == row["sha256"]
        assert len(data) == row["bytes"]
    for lic in desktop.LICENSES:
        assert (out / lic).exists()


def test_static_and_named(desk):
    out, report = desk
    seen_ps = set()
    for name, row in report["files"].items():
        f = TTFont(out / name)
        assert not set(desktop.VAR_TABLES) & set(f.keys()), name
        italic = row["style"].endswith("Italic")
        weight = row["weight"]
        assert _name(f, 16) == row["family"]
        assert _name(f, 17) == row["style"]
        assert _name(f, 6) == name.removesuffix(".ttf")
        seen_ps.add(_name(f, 6))
        assert not any(n.nameID == 25 or n.nameID >= 256 for n in f["name"].names)
        assert f["OS/2"].usWeightClass == weight
        sel = f["OS/2"].fsSelection
        assert bool(sel & 1) == italic
        assert bool(sel & 1 << 5) == (weight == 700)
        assert bool(sel & 1 << 6) == (weight == 400 and not italic)
        assert f["head"].macStyle == (2 if italic else 0) | (1 if weight == 700 else 0)
        # RIBBI share the legacy family; Light and Medium stand alone under the same ID 16
        if weight in (400, 700):
            assert _name(f, 1) == row["family"]
        else:
            assert _name(f, 1) == f"{row['family']} {desktop.STYLE[weight]}"
            assert _name(f, 2) in ("Regular", "Italic")
    assert len(seen_ps) == 12


def test_reproducible(desk, tmp_path):
    _, report = desk
    again = desktop.build(tmp_path / "desktop", tmp_path / "r.json")
    assert again == report


@pytest.mark.parametrize("key,weight", [(k, w) for k in SAMPLES for w in desktop.WEIGHTS])
def test_advances_match_the_web(desk, key, weight):
    out, _ = desk
    text = SAMPLES[key]
    family, ps_prefix, vf_file, _ = desktop.FAMILIES[0 if key == "latin" else 1]
    web = _shape(_sfnt(desktop.WEB / vf_file), text, weight)
    static = _shape((out / f"{ps_prefix}-{desktop.style_name(weight, False).replace(' ', '')}.ttf").read_bytes(), text, None)
    assert [g for g, _ in static] == [g for g, _ in web]
    assert max(abs(a - b) for (_, a), (_, b) in zip(static, web)) <= TOLERANCE_UNITS


@pytest.mark.parametrize("weight", desktop.WEIGHTS)
def test_italic_is_the_web_italic(desk, weight):
    out, _ = desk
    text = SAMPLES["latin"]
    web = _shape(_sfnt(desktop.WEB / f"AltruvexSansLatin-Italic-{weight}.woff2"), text, None)
    static = _shape((out / f"AltruvexSans-{desktop.style_name(weight, True).replace(' ', '')}.ttf").read_bytes(), text, None)
    assert static == web
