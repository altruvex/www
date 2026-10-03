"""Font loading on the apps/www production build (step 30), payload budgets (step 23) and the
runtime line-height check (step 17b).

The brand faces are `font-display: optional` with preload (decided 2026-09-30). Two paths are
asserted to pass on every engine that ran, every route and width, every run:
- as_served: zero heading line-count changes after first paint and CLS <= 0.01 (where measurable);
- font_late: the brand file arrives after first paint, the brand face is not applied (the fallback
  stays) and zero heading line-count changes, the spec's hard rule.
Every verdict and summary number is also recomputed from the per-run records, so a hand-edited or
stale report fails. Glyph / button width diagnostics are recorded in the report, not asserted.

Budgets (config/font.yaml, enforced): dist/payload-report.json must be within every one, and the
check itself is proven to fail on a synthetic over-budget report.

The live check re-measures one case against a running `next start` of the same build
(WWW_BASE, default http://127.0.0.1:3020) and is skipped when the server, the build or the
engine is not there.
"""
from __future__ import annotations

import copy
import json

import pytest

import build as build_mod
import font_loading as fl
import payload as pl
from config import ROOT, load

REPORT = ROOT / "dist" / "font-loading-report.json"
PAYLOAD = ROOT / "dist" / "payload-report.json"
CASES = [f"{loc}/{w}" for loc in fl.ROUTES for w in fl.WIDTHS]
PATHS = ("as_served", "font_late")


def _load(path):
    if not path.exists():
        pytest.skip(f"no {path.relative_to(ROOT)}: run tools/{'payload' if path == PAYLOAD else 'font_loading'}.py "
                    "against `next start` of apps/www")
    return json.loads(path.read_text())


@pytest.fixture(scope="module")
def report():
    return _load(REPORT)


@pytest.fixture(scope="module")
def payload():
    return _load(PAYLOAD)


def _ran(report):
    return {n: e for n, e in report["engines"].items() if "not_run" not in e}


def _series(report):
    for name, e in _ran(report).items():
        for case, c in e["cases"].items():
            for variant in ("as_served", "font_late", "no_arabic_preload"):
                if variant in c:
                    yield (name, case, variant), c[variant]
        for variant, s in e.get("slow_4g_en_mobile", {}).items():
            yield (name, "slow_4g_en_mobile", variant), s


# ------------------------------------------------------------------ the two paths pass

@pytest.mark.parametrize("path", PATHS)
def test_path_passes(report, path):
    """Hard gate: every engine that ran, every route x width, every run."""
    failing = {f"{n} {case}": [{"cls": r["cls"], "heading_line_changes": r["heading_line_changes"],
                                **({"fallback_stays": r["fallback_stays"]} if path == "font_late" else {})}
                               for r in c[path]["per_run"] if not r["pass"]]
               for n, e in _ran(report).items() for case, c in e["cases"].items() if not c[path]["pass"]}
    assert not failing, failing
    assert report["paths"][path] is True


def test_report_pass(report):
    assert report["pass"] is True
    assert report["pass"] == all(report["paths"].values())


def test_every_engine_is_run_or_says_why(report):
    assert set(report["engines"]) == set(fl.ENGINES)
    for name, e in report["engines"].items():
        if "not_run" in e:
            assert e["not_run"], name
            continue
        assert set(e["cases"]) == set(CASES), name
        for case, c in e["cases"].items():
            assert set(PATHS) <= set(c), (name, case)
            assert ("no_arabic_preload" in c) == case.startswith("en/"), (name, case)
    assert report["browser_ok"] == bool(_ran(report))
    assert "chromium" in _ran(report) and "webkit" in _ran(report)
    assert "not_run" in report["engines"].get("firefox", {"not_run": "absent"})


def test_webkit_block_period_is_recorded(report):
    """Diagnostic, not a pass criterion: the key exists, is either a reasoned not_run or the full
    table, and its finding is exactly what the recorded rows say (a hand-edited finding fails)."""
    assert "webkit_block_period" in report
    bp = report["webkit_block_period"]
    if "not_run" in bp:
        assert bp["not_run"] and "webkit" not in _ran(report)
        return
    assert "webkit" in _ran(report) and bp["engine"] == "webkit" and bp["runs"] >= 1
    assert set(bp["hold_ms"]) == {str(h) for h in fl.BLOCK_HOLDS_MS}
    for hold, rows in bp["hold_ms"].items():
        assert set(rows) == set(fl.BLOCK_DISPLAYS), hold
        for d, row in rows.items():
            assert len(row["fcp_ms"]) == len(row["lcp_ms"]) == bp["runs"], (hold, d)
            assert row["brand_requests_held"] and all(n > 0 for n in row["brand_requests_held"]), (hold, d)
            # the display value under test really reached the page: every brand face carries it
            assert row["face_display_seen"] and all(x.endswith(":" + d) for x in row["face_display_seen"]), (hold, d)
            assert row["rewritten"] == [2], (hold, d)
    # The control holds the site's non-brand woff2 files. Since 2026-10-01 the site loads no other
    # web font, so it holds nothing ([0]) and proves nothing; it must then say so by holding in no run.
    ctl_held = bp["control_other_font_held"]["brand_requests_held"]
    assert ctl_held == [0] or all(n > 0 for n in ctl_held)
    assert bp["as_built_no_hold"]["median_fcp_ms"] is not None
    assert bp["finding"] == fl.block_finding(bp)


def test_a_launch_failure_keeps_playwrights_first_line():
    from browser import explain_launch_failure
    err = Exception("BrowserType.launch: Failed to launch the browser process.\nlog line")
    assert explain_launch_failure("chromium", err) == "BrowserType.launch: Failed to launch the browser process."
    assert explain_launch_failure("firefox", err).startswith("BrowserType.launch: Failed to launch")


def test_thresholds_are_the_decided_ones(report):
    t = report["thresholds"]
    assert t["cls_max"] == fl.CLS_MAX == 0.01
    assert t["heading_line_changes"] == 0
    assert t["diagnostic_glyph_width_pct"] == fl.DIAG_GLYPH_PCT == 1.5
    assert t["diagnostic_button_width_px"] == fl.DIAG_BUTTON_PX == 33
    assert report["font_display"].startswith("optional")


# ------------------------------------------------------------------ verdicts follow the records

def test_run_verdicts_follow_the_rules(report):
    for key, s in _series(report):
        assert s["runs"] == report["runs"] == len(s["per_run"]), key
        for r in s["per_run"]:
            if s["mode"] == "as_served":
                want = not r["heading_line_changes"] and (r["cls"] is None or r["cls"] <= fl.CLS_MAX)
            else:
                assert r["fallback_stays"] == (r["brand_drawn"] is not True and (
                    r["brand_dropped"] or (all(x.endswith(":loaded") for x in r["brand_status_final"])
                                           and not r["brand_set_moved"]))), key
                want = not r["heading_line_changes"] and r["fallback_stays"]
            assert r["pass"] == want, key
        assert s["pass"] == all(r["pass"] for r in s["per_run"]), key
    ran = _ran(report)
    for p in PATHS:
        assert report["paths"][p] == all(c[p]["pass"] for e in ran.values() for c in e["cases"].values())


def test_font_late_really_held_the_brand(report):
    """Path b is only evidence if the brand files were held past first paint."""
    for (name, case, variant), s in _series(report):
        if s["mode"] != "font_late":
            continue
        fr = s["first_run"]
        assert fr["brand_held"] > 0, (name, case)
        assert not any(x.endswith(":loaded") for x in fr["brand_status_held"]), (name, case, fr["brand_status_held"])
        labels = [x["label"] for x in fr["snapshots"]]
        assert labels[0] == "first_paint" and "held" in labels and labels[-1] == "final", (name, case)
        held = next(x for x in fr["snapshots"] if x["label"] == "held")
        assert not any(f.startswith("brandLatin:loaded") or f.startswith("brandArabic:loaded")
                       for f in held["faces"]), (name, case, held["faces"])


def test_medians_follow_the_runs(report):
    for key, s in _series(report):
        for k in ("lcp_ms", "cls", "font_bytes_before_load", "font_bytes_total"):
            assert s[f"median_{k}"] == fl._median(s["per_run"], k), (key, k)
        cls = [r["cls"] for r in s["per_run"] if r["cls"] is not None]
        assert s["max_cls"] == (max(cls) if cls else None), key


def test_summary_and_line_height_are_recomputed(report):
    assert report["summary"] == fl.summarize(report)
    assert report["line_height_normal"] == fl.line_height_findings(report)
    assert report["line_height_normal"]["count"] == len(report["line_height_normal"]["findings"])


def test_diagnostics_are_recomputed(report):
    for name, e in _ran(report).items():
        for case, c in e["cases"].items():
            assert c["diagnostics"] == fl.diagnostics(c["as_served"], c["font_late"]), (name, case)


# ------------------------------------------------------------------ payload + budgets

def test_payload_report_matches_files(payload):
    cfg = load()
    files = pl.brand_files(cfg)
    for key in ("latin", "arabic"):
        assert payload["files"][key]["sha256"] == files[key]["sha256"], "dist/web changed since the payload run"
        assert payload["files"][key]["kb"] == files[key]["kb"]
        assert payload["files"][key]["served_matches_dist"] is True
    for loc in pl.ROUTES:
        widths = payload["routes"][loc]["widths"]
        for w, v in widths.items():
            assert v["initial_kb"] == pl.kb(sum(f["bytes"] for f in v["fonts"] if f["before_load"])), (loc, w)
        assert payload["route_kb"][loc] == max(v["initial_kb"] for v in widths.values())


def test_budgets_are_enforced_as_approved():
    b = load().budgets
    assert b.enforced is True
    assert (b.latin_woff2_kb, b.arabic_woff2_kb) == (49, 51)
    assert b.initial_route_font_kb == {"en": 226, "ar": 263}
    assert b.proposed_rule == "baseline x 1.10, rounded up to a whole KB"
    assert b.proposed.model_dump() == {k: getattr(b, k) for k in ("latin_woff2_kb", "arabic_woff2_kb",
                                                                  "initial_route_font_kb")}


def test_payload_is_within_budget(payload):
    assert pl.budget_violations(payload, load().budgets) == []


@pytest.mark.parametrize("field, where", [
    ("latin", ("files", "latin", "kb")),
    ("arabic", ("files", "arabic", "kb")),
    ("initial en", ("route_kb", "en")),
    ("initial ar", ("route_kb", "ar")),
])
def test_budget_check_fails_over_budget(payload, tmp_path, field, where):
    """A synthetic report 1 KB over one budget, written and read back, must be refused."""
    rep = copy.deepcopy(payload)
    b = load().budgets
    limit = {"latin": b.latin_woff2_kb, "arabic": b.arabic_woff2_kb,
             "initial en": b.initial_route_font_kb["en"], "initial ar": b.initial_route_font_kb["ar"]}[field]
    node = rep
    for k in where[:-1]:
        node = node[k]
    node[where[-1]] = limit + 1
    f = tmp_path / "payload-report.json"
    f.write_text(json.dumps(rep))
    bad = pl.budget_violations(json.loads(f.read_text()), b)
    assert len(bad) == 1 and field.split()[-1] in bad[0], bad


def test_enforced_budget_cannot_be_null():
    from config import Budgets
    with pytest.raises(ValueError):
        Budgets(enforced=True, latin_woff2_kb=None, arabic_woff2_kb=51, initial_route_font_kb={"en": 1, "ar": 1})


def test_build_report_carries_both(report, payload):
    tests = build_mod.aggregate_tests()
    assert tests["font_loading"]["pass"] == report["pass"]
    assert build_mod.route_payload()["route_kb"] == payload["route_kb"]


# ------------------------------------------------------------------ live

@pytest.mark.browser
def test_live_font_late_keeps_the_fallback(report):
    """Same build, Chromium EN desktop: the late brand file is not applied, no heading re-wraps."""
    base = pl.base_url(None)
    if err := pl.reachable(base):
        pytest.skip(err)
    if pl.build_id() != report["next_build_id"]:
        pytest.skip("apps/www/.next is a different build than the report's; re-run tools/font_loading.py")
    with fl.engines(("chromium",)) as it:
        for _, browser, err in it:
            if browser is None:
                pytest.skip(f"chromium did not launch: {err}")
            fresh = fl.page_run(browser, base, "/", fl.WIDTHS["desktop"], "font_late")
    assert fresh["brand_held"] > 0
    assert fresh["heading_line_changes"] == []
    assert fresh["fallback_stays"] is True and fresh["pass"] is True
