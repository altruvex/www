"""Hero Arabic weight (decision 5) is a measured choice, not a typed number.

tools/pairing.py measures ink density in the browser engines and writes proofs/a5/pairing.json;
tools/tracking.py turns its chosen weight into --weight-ar-display-light. These tests hold the
chain together: the token is the report's argmin, the report was measured for today's rule and
fonts, and (browser-marked) a fresh measurement picks the same weight.
"""
import json
import re

import pytest

import pairing
import tracking


@pytest.fixture(scope="module")
def report():
    return json.loads(pairing.REPORT.read_text())


def _token(css: str) -> int:
    return int(re.search(r"--weight-ar-display-light:\s*(\d+);", css).group(1))


def test_report_is_for_this_rule_and_these_fonts(cfg, report):
    assert report["rule"] == pairing.spec(cfg)
    assert report["fonts_sha256"] == pairing.font_hashes(cfg)


def test_targets_are_the_mean_reference_ratio(report):
    for name, e in report["engines"].items():
        if "not_run" in e:
            continue
        mean = sum(r["ratio"] for r in e["references"]) / len(e["references"])
        assert e["target"] == pytest.approx(mean, abs=1e-4), name
        best = min(e["hero"]["rows"], key=lambda r: (abs(r["ratio"] - e["target"]), r["weight"]))
        assert e["argmin"] == best["weight"], name


def test_token_is_the_reports_argmin(report):
    chosen = pairing.choose(report["engines"])
    assert chosen == report["chosen"]
    assert _token(tracking.TOKENS.read_text()) == chosen["weight"]
    mean = {int(w): d for w, d in chosen["mean_distance"].items()}
    assert chosen["weight"] == min(mean, key=lambda w: (mean[w], w))


def test_chosen_weight_is_inside_the_searched_range(cfg, report):
    r = cfg.pairing.ar_weights
    assert r.start < report["chosen"]["weight"] < r.stop, "argmin on the range edge: widen ar_weights"


@pytest.mark.browser
def test_fresh_measurement_picks_the_same_weight(cfg, report):
    fresh = pairing.choose(pairing.collect(cfg))
    assert fresh["weight"] == report["chosen"]["weight"]
