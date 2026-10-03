"""Arabic weight remap (step 13): a requested weight draws the chosen source weight, nothing else moves."""
import pytest
from fontTools.ttLib import TTFont
from fontTools.varLib.models import piecewiseLinearMap

import build

F2DOT14 = 1 / 16384


def _norm(u: float) -> float:  # Vazirmatn wght: 100 / 400 / 900
    return (u - 400) / 500 if u >= 400 else (u - 400) / 300


@pytest.fixture(scope="module")
def maps(cfg, built):
    out_dir, _ = built
    out = TTFont(out_dir / cfg.families["arabic"].output)
    src = TTFont(cfg.sources["vazirmatn"].path("vazirmatn", "font"))
    return out["avar"].segments["wght"], src["avar"].segments["wght"]


def test_pairs_come_from_config(cfg):
    assert build.weight_pairs(cfg.weights) == [(500, 500), (600, 675), (700, 830)]


@pytest.mark.parametrize("requested,drawn", [(100, 100), (200, 200), (300, 300), (400, 400),
                                             (500, 500), (600, 675), (700, 830), (900, 900)])
def test_requested_weight_draws_chosen(maps, requested, drawn):
    out, src = maps
    got = piecewiseLinearMap(_norm(requested), out)
    want = piecewiseLinearMap(_norm(drawn), src)
    assert abs(got - want) <= 2 * F2DOT14, (requested, drawn, got, want)


def test_map_stays_monotonic(maps):
    out, _ = maps
    ys = [piecewiseLinearMap(_norm(w), out) for w in range(100, 901, 25)]
    assert ys == sorted(ys) and len(set(ys)) == len(ys)


def test_no_remap_without_a_choice(cfg):
    unchosen = {w: v.model_copy(update={"chosen": None}) for w, v in cfg.weights.items()}
    assert build.weight_pairs(unchosen) == []


def test_stored_avar_is_in_order(cfg, built):
    """OTS (the browsers' font sanitizer) discards an avar whose stored map is not strictly
    increasing, so check the bytes as written, after F2Dot14 rounding."""
    import struct
    out_dir, _ = built
    data = TTFont(out_dir / cfg.families["arabic"].output).reader["avar"]
    (count,) = struct.unpack(">H", data[8:10])
    pairs = struct.unpack(f">{2 * count}h", data[10:10 + 4 * count])
    froms, tos = pairs[0::2], pairs[1::2]
    assert all(a < b for a, b in zip(froms, froms[1:])), froms
    assert all(a <= b for a, b in zip(tos, tos[1:])), tos
