"""The same sources and config must give byte-identical files, and dist/ must be that output."""
import pytest

import build as build_mod
from config import ROOT
from fetch import verify_sources


def test_sources_match_pins(cfg):
    verify_sources(cfg)


def test_wrong_pin_fails(cfg):
    key = cfg.families["latin"].source
    src = cfg.sources[key]
    bad_font = src.files["font"].model_copy(update={"sha256": "0" * 64})
    bad = cfg.model_copy(update={"sources": {
        key: src.model_copy(update={"files": {**src.files, "font": bad_font}})}})
    with pytest.raises(SystemExit, match="SHA-256 mismatch"):
        verify_sources(bad)


def test_two_builds_are_byte_identical(built, tmp_path, cfg):
    out_a, _ = built
    out_b = tmp_path / "build-b"
    build_mod.build(out_b, out_b / "build-report.json")
    for fam in cfg.families.values():
        assert (out_a / fam.output).read_bytes() == (out_b / fam.output).read_bytes(), fam.output
    assert (out_a / "build-report.json").read_bytes() == (out_b / "build-report.json").read_bytes()


def test_committed_dist_is_current(built, cfg):
    out, _ = built
    for fam in cfg.families.values():
        shipped = ROOT / "dist" / "web" / fam.output
        assert shipped.read_bytes() == (out / fam.output).read_bytes(), (
            f"{shipped.name} is stale — run tools/build.py")
