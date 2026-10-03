"""Smoke test for the A.4 optical proof (step 26, step 15 display rows): every block measures in
each engine that launches, with finite numbers. The page states numbers only; nothing here judges them."""
import math

import pytest

import optical

pytestmark = pytest.mark.browser

OPTICAL_KINDS = 9   # vertical + eight line blocks per size
OPTICAL_SIZES = 3
DISPLAY_BLOCKS = 5 * 3  # sizes x weights


@pytest.fixture(scope="module")
def results():
    return optical.collect(shots=False)


@pytest.fixture(params=["chromium", "firefox", "webkit"])
def engine(request, results):
    r = results[request.param]
    if "not_run" in r:
        pytest.skip(f"{request.param} did not launch: {r['not_run']}")
    return r


def _numbers(x):
    if isinstance(x, dict):
        for v in x.values():
            yield from _numbers(v)
    elif isinstance(x, list):
        for v in x:
            yield from _numbers(v)
    elif isinstance(x, (int, float)) and not isinstance(x, bool):
        yield x


def test_every_block_measured(engine):
    ids = [b["id"] for b in engine["blocks"]]
    assert sorted(ids) == sorted(engine["shots"])
    assert len(ids) == OPTICAL_KINDS * OPTICAL_SIZES + DISPLAY_BLOCKS
    assert all(b["lines"] for b in engine["blocks"])


def test_no_nan(engine):
    assert all(math.isfinite(v) for v in _numbers(engine["blocks"]))


def test_drawn_weight_comes_from_the_build_report(engine):
    ar = [ln for b in engine["blocks"] if b["section"] == "display" for ln in b["lines"] if ln["lang"] == "ar"]
    assert {ln["weight"]: ln["drawn"] for ln in ar} == {400: 400, **{int(k): v for k, v in engine["drawn"].items()}}
