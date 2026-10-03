"""FontBakery check-universal (step 24): no unlisted FAIL, every WARN has a decision, report current.

A clean run is not typography approval."""
import json

import pytest

import fontbakery as fb

_reason = fb.available()
pytestmark = pytest.mark.skipif(_reason is not None, reason=f"FontBakery not run: {_reason}")
FONTS = sorted(fb.FONTS)


@pytest.fixture(scope="module")
def report():
    return fb.generate()


def _ids(report, key: str, status: str) -> set[str]:
    return {i["check"] for i in report["fonts"][key]["issues"] if i["status"] == status}


def test_committed_report_is_current(report):
    committed = json.loads(fb.REPORT.read_text())
    assert committed == report, "dist/fontbakery-report.json is stale — run tools/fontbakery.py"


@pytest.mark.parametrize("key", FONTS)
def test_every_warn_has_a_decision(report, key):
    warns, table = _ids(report, key, "WARN"), fb.DECISIONS[key]
    assert warns - table.keys() == set(), "new WARN: add a decision to DECISIONS"
    assert table.keys() - warns == set(), "stale decision: the WARN no longer occurs"
    assert all(d.startswith(("accept: ", "fix proposed: ")) for d in table.values())


@pytest.mark.parametrize("key", FONTS)
def test_zero_fail(report, key):
    fails, known = _ids(report, key, "FAIL"), fb.KNOWN_FAILS[key]
    assert fails - known.keys() == set(), "new FAIL"
    assert known.keys() - fails == set(), "stale KNOWN_FAILS entry: the FAIL is fixed, remove it"
    if fails:
        pytest.xfail("; ".join(f"{c}: {known[c]}" for c in sorted(fails)))
