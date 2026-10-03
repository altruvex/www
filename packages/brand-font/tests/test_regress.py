"""Steps 21 and 22, rendered in each engine that launches (proofs/a4-regress.html via tools/regress.py).

Step 21: no Arabic dot or mark may be clipped by the Accent's background-clip:text. A clipped pixel is
one at least half inked by the plain copy that the clipped black copy paints under a quarter of, with
no such pixel within one device pixel of it; that threshold already absorbs antialiasing along shared
edges and a run rastered one pixel over, and cases with nothing outside the box measure exactly 0, so
the tolerance is 2 device pixels per case. Live (Outfit/Vazirmatn) is recorded as reference only.
The fix lives in apps/www/components/ui/emphasis.tsx (padding with an equal negative margin); the page
mirrors it, and test_mirror_* fail if the two drift apart. test_fix_does_not_move_layout pins that the
padding takes no room.

Step 22: every character Intl and the site's formatters emit for real prices is drawn by a
production family, or is an invisible control that takes no room and draws nothing.
"""
import json
import re
import unicodedata

import pytest

import regress
from config import ROOT

browser = pytest.mark.browser

CLIP_TOLERANCE_PX = 2

REPO = ROOT.parent.parent
COMPONENT = REPO / "apps" / "www" / "components" / "ui" / "emphasis.tsx"
SECTION_HEADING = REPO / "apps" / "www" / "components" / "sections" / "section-heading.tsx"
MIRROR = ROOT / "proofs" / "a4-regress.html"
# property -> (utility prefix in emphasis.tsx, sign)
_UTILITIES = {"pt": "padding-top", "pb": "padding-bottom", "pe": "padding-inline-end",
              "mt": "margin-top", "mb": "margin-bottom", "me": "margin-inline-end"}


@pytest.fixture(scope="module")
def results():
    return regress.collect(shots=False)


@pytest.fixture(params=["chromium", "firefox", "webkit"])
def engine(request, results):
    r = results["engines"][request.param]
    if "not_run" in r:
        pytest.skip(f"{request.param} did not launch: {r['not_run']}")
    return request.param, r


def _prod(r):
    return [c for c in r["accent"] if c["stack"].startswith("prod")]


@browser
def test_accent_measurement_is_sound(engine):
    """Guards the metric: every copy has ink, none reaches its frame, and zero is reachable."""
    _, r = engine
    for c in r["accent"]:
        assert c["ink_px"] > 0 and c["real_ink_px"] > 0 and not c["touches_edge"], c
    assert any(c["clipped_px"] == 0 for c in _prod(r))


@browser
def test_prod_accent_keeps_arabic_marks(engine):
    """Dots, marks and descenders in the brand fonts survive the Accent's clip, both displays."""
    _, r = engine
    bad = {c["id"]: c["clipped_px"] for c in _prod(r) if c["clipped_px"] > CLIP_TOLERANCE_PX}
    assert not bad, bad


@browser
def test_fix_does_not_move_layout(engine):
    """The Accent's padding is cancelled by its negative margin: same heading height, same line count,
    same text line tops as the Accent without either, inline-block, inline and mobile block, narrow
    (wrapping) and wide."""
    _, r = engine
    assert r["layout"]
    for rec in r["layout"]:
        assert rec["before"] == rec["after"], rec
    assert any(rec["before"]["lines"] > 1 for rec in r["layout"]), "no case wraps: the probe is too wide"


@browser
def test_prod_accent_uses_only_prod_fonts(engine):
    name, r = engine
    if name != "chromium":
        pytest.skip("CDP platform-font attribution is Chromium only")
    for c in _prod(r):
        for f in c["platform_fonts"]:
            assert f["custom"] and f["family"].startswith("Altruvex Sans "), (c["id"], f)


@browser
def test_every_emitted_codepoint_is_drawn(engine):
    _, r = engine
    for loc, n in r["numbers"].items():
        for cp, v in n["codepoints"].items():
            assert v["family"] is not None or v["uncovered"] != "FAIL", (loc, cp, v)
            assert not v["fallback_differs"], (loc, cp, v)
            cat = unicodedata.category(chr(int(cp[2:], 16)))
            if v["family"] is not None and cat[0] != "Z" and cat != "Cf":
                assert v["ink_px"] > 0, (loc, cp, v)


@browser
def test_numerals_resolve_to_their_script(engine):
    """Guards the collection: both numeral systems and their separators were actually emitted."""
    _, r = engine
    ar, en = r["numbers"]["ar"]["codepoints"], r["numbers"]["en"]["codepoints"]
    for c in [*range(0x0660, 0x066A), 0x066C]:
        assert ar[f"U+{c:04X}"]["family"] == "Altruvex Sans Arabic"
    for c in [*range(0x30, 0x3A), 0x2C]:
        assert en[f"U+{c:04X}"]["family"] == "Altruvex Sans Latin"


@browser
def test_numbers_use_only_prod_fonts(engine):
    name, r = engine
    if name != "chromium":
        pytest.skip("CDP platform-font attribution is Chromium only")
    for loc, n in r["numbers"].items():
        for kind, fonts in n["platform_fonts"].items():
            for f in fonts:
                assert f["custom"] and f["family"].startswith("Altruvex Sans "), (loc, kind, f)


@browser
def test_no_price_reaches_the_output(results):
    text = json.dumps(results, ensure_ascii=False)
    data = regress.prices()
    money = [s for loc in data["site"].values() for s in loc if any(m in s for m in ("EGP", "USD", "جنيه", "دولار"))]
    leaks = [s for s in money if s in text]
    leaks += [f"{a:,}" for a in data["amounts"] + data["usd"] if a >= 1000 and f"{a:,}" in text]
    assert money
    if leaks:  # count only: pytest's assert rewriting would print the prices
        pytest.fail(f"{len(leaks)} price strings in the output")


def _component_utilities() -> dict[str, float]:
    """Signed em value per property, read from the Accent's class string in emphasis.tsx."""
    src = COMPONENT.read_text(encoding="utf-8")
    body = src[src.index("export const Accent"):src.index("Accent.displayName")]
    found: dict[str, float] = {}
    for neg, prefix, em in re.findall(r"(?<![\w-])(-?)(pt|pb|pe|mt|mb|me)-\[([0-9.]+)em\]", body):
        prop = _UTILITIES[prefix]
        assert prop not in found, f"{prop} set twice in the Accent: {found}"
        found[prop] = -float(em) if neg else float(em)
    return found


def test_component_pads_and_cancels():
    """emphasis.tsx sets all six utilities, and each margin is exactly minus its padding."""
    u = _component_utilities()
    assert set(u) == set(_UTILITIES.values()), u
    for pad, margin in (("padding-top", "margin-top"), ("padding-bottom", "margin-bottom"),
                        ("padding-inline-end", "margin-inline-end")):
        assert u[pad] > 0 and u[margin] == -u[pad], (pad, u)


def _mirror_rule() -> dict[str, list[float]]:
    css = MIRROR.read_text(encoding="utf-8")
    m = re.search(r"\n\s*\.acc \{([^}]*)\}", css)
    assert m, ".acc rule not found in proofs/a4-regress.html"
    out = {}
    for prop, val in re.findall(r"((?:padding|margin)-[a-z-]+)\s*:\s*([^;]+);", m.group(1)):
        out[prop] = [float(x.removesuffix("em")) for x in val.split()]
    return out


def test_mirror_matches_component():
    """The harness page draws the Accent with these values; if emphasis.tsx changes and the page does
    not, the numbers it produces describe a component that no longer exists."""
    u = _component_utilities()
    mirror = _mirror_rule()
    assert mirror["padding-block"] == [u["padding-top"], u["padding-bottom"]], (mirror, u)
    assert mirror["margin-block"] == [u["margin-top"], u["margin-bottom"]], (mirror, u)
    assert mirror["padding-inline-end"] == [u["padding-inline-end"]], (mirror, u)
    assert mirror["margin-inline-end"] == [u["margin-inline-end"]], (mirror, u)


def test_mirror_matches_section_heading_block_margin():
    """SectionHeading's mobile block accent keeps its 0.5rem gap by subtracting the top padding."""
    u = _component_utilities()
    heading = SECTION_HEADING.read_text(encoding="utf-8")
    used = re.findall(r"mt-\[calc\(0\.5rem-([0-9.]+)em\)\] block", heading)
    assert used == [f"{u['padding-top']:g}"], (used, u)
    page = MIRROR.read_text(encoding="utf-8")
    probe = re.findall(r"calc\(0\.5rem - ([0-9.]+)em\)\"", page)
    assert probe == [f"{u['padding-top']:g}"], (probe, u)
