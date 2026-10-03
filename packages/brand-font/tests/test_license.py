"""OFL / Reserved Font Name checks against the pinned upstream files."""
import pytest
from fontTools.ttLib import TTFont

import licensing


@pytest.mark.parametrize("key", ["latin", "arabic"])
def test_build_passes_and_declares_no_rfn(cfg, built, key):
    lic = built[1]["license"][key]
    assert lic["ok"] and lic["ofl_1_1"]
    assert lic["declared_rfns"] == []
    for nid in ("1", "4", "6"):
        assert all("Altruvex Sans" in v or "AltruvexSans" in v for v in lic["derivative_names"][nid])


def _pair(cfg, built, key):
    fam = cfg.families[key]
    src = cfg.sources[fam.source]
    return (src.path(fam.source, "license").read_text(),
            TTFont(src.path(fam.source, "font")), TTFont(built[0] / fam.output))


def test_declared_rfn_in_header_is_detected(cfg, built):
    ofl, up, out = _pair(cfg, built, "latin")
    header, body = ofl.split("\n", 1)
    ofl_rfn = f'{header}, with Reserved Font Name "Altruvex Sans".\n{body}'
    r = licensing.check(ofl_rfn, up, out)
    assert r["declared_rfns"] == ["Altruvex Sans"]
    assert not r["ok"] and r["rfn_violations"]


def test_generic_ofl_body_is_not_an_rfn(cfg, built):
    ofl, up, _ = _pair(cfg, built, "arabic")
    assert "Reserved Font Name" in ofl
    assert licensing.declared_rfns(ofl, up) == []


def test_upstream_name_left_behind_is_caught(cfg, built):
    ofl, up, out = _pair(cfg, built, "arabic")
    for rec in out["name"].names:
        if rec.nameID == 4:
            rec.string = "Vazirmatn Regular"
    r = licensing.check(ofl, up, out)
    assert not r["ok"] and r["upstream_family_left_in_names"]


def test_upstream_copyright_is_kept(cfg, built):
    _, up, out = _pair(cfg, built, "arabic")
    assert out["name"].getDebugName(0).startswith(up["name"].getDebugName(0))
    assert out["name"].getDebugName(10) == up["name"].getDebugName(10)
