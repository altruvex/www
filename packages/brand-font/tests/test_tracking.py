"""Tracking tokens are generated, not typed: deterministic, within tolerance, and committed."""
import re

import pytest
from fontTools.ttLib import TTFont

import tracking


@pytest.fixture(scope="module")
def generated(cfg):
    return tracking.generate(cfg, TTFont(tracking.LATIN_FONT))


def test_generation_is_deterministic(cfg, generated):
    again = tracking.generate(cfg, TTFont(tracking.LATIN_FONT))
    assert again == generated


def test_committed_tokens_are_current(generated):
    css, _ = generated
    assert tracking.TOKENS.read_text() == css, "dist/web/tokens.css is stale — run tools/tracking.py"


def test_letter_gap_shrinks_with_weight(generated):
    _, rep = generated
    k = [rep["k_sidebearing"][w] for w in sorted(rep["k_sidebearing"], key=int)]
    assert k == sorted(k, reverse=True)
    assert rep["k_sidebearing"]["400"] == 1.0


def _css_tokens(css: str) -> dict[str, float]:
    return {k: float(v.removesuffix("em")) for k, v in re.findall(r"^\s*(--[\w-]+):\s*([^;\n]+);", css, re.M)}


def test_ladder_reversals_are_reported_not_smoothed(cfg, generated):
    """The ladder at 400 is back-solved from the live anchors as they are; any size where it
    loosens instead of tightening must appear in the report."""
    _, rep = generated
    at400 = rep["ladder_400"]
    found = [(a[0], b[0]) for a, b in zip(at400, at400[1:]) if b[1] > a[1]]
    assert [(r["from_px"], r["to_px"]) for r in rep["ladder_reversals"]] == found
    assert [a[0] for a in at400] == [a[0] for a in cfg.spacing.ladder_anchors]


def test_live_anchors_reproduced_by_their_tokens(cfg, generated):
    """Each live apps/www pair, read through the token that covers its size, lands within the
    bucket tolerance (a fraction of that weight's n letter gap) of the live value."""
    css, rep = generated
    tokens = _css_tokens(css)
    sizes = sorted({int(m.group(1)) for k in tokens if (m := re.match(r"--track-(\d+)-", k))})
    for px, w, em, _source in cfg.spacing.ladder_anchors:
        size = max(s for s in sizes if s <= px)
        gap = rep["latin_letter_white"][str(w)]["n"]["gap"]
        err = abs(tokens[f"--track-{size}-{w}"] - em) / gap
        assert err <= cfg.spacing.bucket_gap_fraction, (px, w, em, size, err)


def test_caps_keep_the_lowercase_word_ratio(cfg, generated):
    """All-caps at the lowercase token plus the caps word-spacing token has the lowercase
    word-to-letter white ratio (space + ws + 2t + gap) / (gap + t), within snapping."""
    css, rep = generated
    tokens = _css_tokens(css)
    caps = rep["caps"]
    prefix = caps["token_prefix"]
    track_sizes = sorted({int(m.group(1)) for k in tokens if (m := re.match(r"--track-(\d+)-", k))})
    caps_sizes = sorted({int(m.group(1)) for k in tokens if (m := re.match(prefix + r"-(\d+)-", k))})
    assert caps_sizes and caps_sizes[0] == cfg.spacing.caps.from_px
    for key, m in caps["measurements"].items():
        w, px = map(int, key.split("/"))
        t = tokens[f"--track-{max(s for s in track_sizes if s <= px)}-{w}"]
        c = tokens[f"{prefix}-{max(s for s in caps_sizes if s <= px)}-{w}"]
        lower = tracking.word_ratio(m["space"], m["gap_n"], t)
        if caps["lever"] == "word_spacing":
            got = (m["space"] + c + 2 * t + m["gap_H"]) / (m["gap_H"] + t)
        else:
            got = tracking.word_ratio(m["space"], m["gap_H"], c)
        assert abs(got - lower) / lower <= 0.02, (key, got, lower)
        # Both levers solve the same rule exactly before snapping.
        assert m["ratio_caps_at_t_caps"] == pytest.approx(m["ratio_lower"], abs=0.002)
        assert m["ratio_caps_with_word_spacing"] == pytest.approx(m["ratio_lower"], abs=0.002)
        # Without a caps token the capitals lose word space (the A.4 finding).
        assert m["ratio_caps_at_t_lower"] < m["ratio_lower"]


def test_every_token_within_tolerance(cfg, generated):
    _, rep = generated
    assert all(w <= cfg.spacing.bucket_gap_fraction for w in rep["worst_gap_fraction_per_bucket"])
    covered = [px for group in rep["size_buckets"] for px in group]
    assert covered == cfg.spacing.sizes


def test_arabic_is_not_tracked_and_line_heights(cfg, generated):
    css, _ = generated
    assert cfg.spacing.arabic_tracking_em == 0
    assert "--track-ar: 0;" in css
    assert f"--lh-display-latin: {cfg.spacing.line_height.display_latin};" in css
    assert "--lh-display-latin: 1.2;" in css
    assert "--lh-heading-ar: 1.3;" in css
    assert "--lh-vocalised: 1.5;" in css
