"""Metric-matched fallback faces (step 18): dist/web/fallback.css is exactly what tools/fallback.py
measures now, every value traces to the report, and the browser deltas are recorded.

The per-string fit (+-1.5% per string with the face's size-adjust) is recorded, not judged: under
font-display: optional a fallback face is never swapped out, so its per-string spread cannot move
layout; it only decides how close a fallback-only page looks. The browser numbers are recorded too."""
import json
import re

import pytest

import fallback as fb
from config import ROOT

_missing = [str(p) for c in fb.CANDIDATES.values() for files in c.values() for p, _ in files if not p.exists()]
pytestmark = pytest.mark.skipif(bool(_missing), reason=f"system fonts measured on macOS are absent: {_missing}")


@pytest.fixture(scope="module")
def fresh():
    return fb.generate()


@pytest.fixture(scope="module")
def committed():
    return json.loads(fb.REPORT_PATH.read_text())


def test_css_matches_a_fresh_run(fresh):
    css, rep = fresh
    assert fb.CSS_PATH.read_text() == css, "dist/web/fallback.css is stale — run tools/fallback.py --browser"
    assert rep["css"]["sha256"] == fb.hashlib.sha256(css.encode()).hexdigest()


def test_report_matches_a_fresh_run(fresh, committed):
    _, rep = fresh
    kept = {k: v for k, v in committed.items() if k not in ("browser", "browser_reason")}
    assert kept == json.loads(json.dumps(rep, ensure_ascii=False, sort_keys=True)), (
        "dist/fallback-report.json is stale — run tools/fallback.py --browser")


def test_two_families_exactly(fresh):
    css, _ = fresh
    assert set(re.findall(r'font-family: "([^"]+)"', css)) == {
        "Altruvex Sans Latin Fallback", "Altruvex Sans Arabic Fallback"}


@pytest.mark.parametrize("script", ["latin", "arabic"])
def test_unicode_range_is_the_brand_cmap(fresh, cfg, script):
    css, _ = fresh
    brand = fb.Font.open(fb.WEB / cfg.families[script].output)
    want = fb.unicode_range(set(brand.cmap))
    blocks = [b for b in css.split("@font-face")[1:] if f'"{fb.FAMILY[script]}"' in b]
    assert blocks and all(f"unicode-range: {want};" in b for b in blocks)


@pytest.mark.parametrize("script", ["latin", "arabic"])
def test_weight_ranges_cover_the_axis_once(fresh, script):
    _, rep = fresh
    fam = rep["families"][script]
    spans = [f["font_weight"] for f in fam["faces"]]
    assert spans[0][0] == fam["brand_axis"][0] and spans[-1][1] == fam["brand_axis"][1]
    assert all(b[0] == a[1] + 1 for a, b in zip(spans, spans[1:]))


@pytest.mark.parametrize("script", ["latin", "arabic"])
def test_overrides_are_brand_metrics_over_size_adjust(fresh, script):
    _, rep = fresh
    fam = rep["families"][script]
    used = fam["brand_vertical"]["used_em"]
    for f in fam["faces"]:
        sa = f["measurement"]["size_adjust"]
        assert f["size_adjust_pct"] == round(sa * 100, 2)
        for k in ("ascent", "descent", "line_gap"):
            assert f[f"{k}_override_pct"] == round(used[k] / sa * 100, 2)


def test_only_measured_fonts_are_sources(fresh):
    _, rep = fresh
    for script, fam in rep["families"].items():
        cand = rep["candidates"][script][fam["chosen"]]
        assert cand["measured"]
        names = {n for s in cand["styles"] for n in s["local"]}
        for f in fam["faces"]:
            assert set(f["local"]) <= names


@pytest.mark.parametrize("script", ["latin", "arabic"])
def test_per_string_fit_is_recorded(committed, script):
    """Every face records how many corpus strings (20+ covered chars) fall outside +-limit, and the worst."""
    for f in committed["families"][script]["faces"]:
        p = f["measurement"]["per_string_fit"]
        assert p["limit_pct"] == fb.PER_STRING_LIMIT_PCT and p["n"] > 0
        assert 0 <= p["over"] <= p["n"] and (p["worst"] or not p["over"])


@pytest.mark.parametrize("engine", ["chromium", "webkit"])
def test_browser_deltas_are_recorded(committed, engine):
    b = committed.get("browser")
    assert b, committed.get("browser_reason", "no browser section")
    assert b["css_sha256"] == committed["css"]["sha256"], "browser run describes older CSS"
    e = b["engines"][engine]
    if "not_run" in e:
        pytest.skip(f"{engine} did not launch: {e['not_run']}")
    for script in ("latin", "arabic"):
        for w in committed["weights"]:
            r = e[script][str(w)]
            for k in ("width_delta_pct", "line_box_delta_pct", "para_height_delta_pct", "para_lines_delta"):
                assert isinstance(r[k], (int, float)), f"{engine} {script} {w} {k}"


def test_package_exports_point_at_files():
    pkg = json.loads((ROOT / "package.json").read_text())
    for sub in ("./fallback.css", "./tokens.css"):
        assert (ROOT / pkg["exports"][sub]).is_file(), sub
    assert "dist/web" in pkg["files"]
