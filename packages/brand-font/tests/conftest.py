from pathlib import Path

import pytest

import build as build_mod
from config import load


@pytest.fixture(scope="session")
def cfg():
    return load()


@pytest.fixture(scope="session")
def built(tmp_path_factory) -> tuple[Path, dict]:
    """One fresh build into a temp dir, shared by the whole session."""
    out = tmp_path_factory.mktemp("build-a")
    rep = build_mod.build(out, out / "build-report.json")
    return out, rep
