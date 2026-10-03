"""Mixed RTL/LTR matrix, prod stack only: Arabic spaces keep Vazirmatn's widths in context, the
bidi order matches the UBA, and every codepoint is covered by one of the two families. Proto and
live are recorded by tools/matrix.py as reference and are not asserted."""
import pytest

import matrix
from browser import ENGINES

pytestmark = pytest.mark.browser

TOL = 0.003
# Vazirmatn's own widths x k, in em.
SPACE_EM = {"U+0020": 0.2852, "U+00A0": 0.2852, "U+2009": 0.2168, "U+202F": 0.0679}


@pytest.fixture(scope="session")
def mx():
    return matrix.collect()


def _engine(mx, name):
    e = mx["engines"][name]
    if "not_run" in e:
        pytest.skip(f"{name} did not launch: {e['not_run']}")
    return e


def _spaces(e, cps):
    for c in e["cases"]:
        for s in c["stacks"]["prod"]["spaces"]:
            if s["cp"] in cps and s["context"] == "arabic":
                yield c, s


@pytest.mark.parametrize("engine", ENGINES)
@pytest.mark.parametrize("cps", [("U+0020", "U+00A0"), ("U+2009",), ("U+202F",)], ids=["space-nbsp", "thin", "nnbsp"])
def test_arabic_space_width_in_context(mx, engine, cps):
    e = _engine(mx, engine)
    seen = list(_spaces(e, cps))
    assert seen, f"no {cps} between Arabic characters in the matrix"
    bad = [f"{c['id']}-{c['slug']} {s['cp']}@{s['index']} = {s['em']}em (want {SPACE_EM[s['cp']]})"
           for c, s in seen if s["em"] is None or abs(s["em"] - SPACE_EM[s["cp"]]) > TOL]
    assert not bad, f"{engine} prod: " + "; ".join(bad)


@pytest.mark.parametrize("engine", ENGINES)
def test_bidi_order(mx, engine):
    e = _engine(mx, engine)
    bad = [f"{c['id']}-{c['slug']}: got {b['visual']}, expected {b['expected']}"
           for c in e["cases"] if not (b := c["stacks"]["prod"]["bidi"])["pass"]]
    assert not bad, f"{engine} prod: " + "; ".join(bad)


@pytest.mark.parametrize("engine", ENGINES)
def test_every_codepoint_covered(mx, engine):
    e = _engine(mx, engine)
    bad = [f"{c['id']}-{c['slug']}: {cp}" for c in e["cases"] for cp in c["coverage_none"]
           if cp not in matrix.KNOWN_ABSENT]
    assert not bad, f"{engine}: no family covers " + "; ".join(bad)
