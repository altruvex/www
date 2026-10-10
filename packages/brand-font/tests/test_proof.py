"""Arabic line height regressions (step 16) and weight sanity, rendered in each engine that launches.

Contact is measured on the raster: two consecutive lines drawn one line pitch apart, and any pixel
where both have ink is an overlap. Plain and mixed Arabic must not touch at --lh-heading-ar (1.3);
fully vocalised Arabic must not touch at --lh-vocalised (1.55), and is shown to touch at 1.3, which
is why the second token exists.
"""
import pytest

import proof

pytestmark = pytest.mark.browser


@pytest.fixture(scope="module")
def results():
    return proof.collect(shots=False)


@pytest.fixture(params=["chromium", "firefox", "webkit"])
def engine(request, results):
    r = results[request.param]
    if "not_run" in r:
        pytest.skip(f"{request.param} did not launch: {r['not_run']}")
    return r


def _rows(r, text, lh):
    rows = [x for x in r["lineHeights"] if x["text"] == text and x["lh"] == lh]
    assert rows, (text, lh)
    return rows


@pytest.mark.parametrize("text", ["plain", "mixed"])
def test_heading_line_height_has_no_contact(engine, text):
    for row in _rows(engine, text, 1.3):
        assert row["overlap_px"] == 0, row
        assert row["contact_gap_em"] > 0, row


def test_vocalised_clears_at_its_line_height(engine):
    for row in _rows(engine, "vocalised", 1.55):
        assert row["overlap_px"] == 0, row
        assert row["contact_gap_em"] > 0, row


def test_vocalised_touches_at_heading_line_height(engine):
    """The counterexample: if this stops failing to clear, --lh-vocalised may be revisited."""
    assert all(row["overlap_px"] > 0 for row in _rows(engine, "vocalised", 1.3))


def test_rendered_line_count_matches(engine):
    assert all(row["dom_lines"] == 3 for row in engine["lineHeights"])


def test_arabic_density_rises_with_weight(engine):
    """Guards the measurement itself: the canvas must honour variable weights."""
    for row in engine["weights"]:
        d = [a["density"] for a in row["ar"]]
        assert d == sorted(d) and len(set(d)) == len(d), row
