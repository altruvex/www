"""The one place the upright Latin is edited: a longer crossbar on t and T (Ali, 2026-10-09).

Outfit draws t with a crossbar at the x-height and T with a bar at the cap height. Both bars are
lengthened by `percent` of their own length, shared evenly between the two ends, and the letter
keeps its sidebearings: the left end of the bar stays where it was, the stem and everything to its
right move by one extension, the right end by two, and the advance grows by two.

The edit runs on the three masters of the variable font (wght 100, 500, 900) and is written back
as explicit gvar deltas, a new HVAR row per glyph, and shifted GPOS mark anchors (with their GDEF
variation rows), so the variable file stays one file. Only the glyphs listed here change; every
other glyph is the upstream's, and integrity.compare is told which ones were edited on purpose.

Glyphs covered: the letters, the accented forms built on them (tcaron, tcommaaccent, Tcaron,
Tcommaaccent, and their ss01 forms), the ss01 t, and the `tt` ligature, which is on by default.
The discretionary ligatures (dlig: Th, Tl, TT, ft, rt, tf, rf) and Outfit's own "outfit"
ligatures are left alone: they are off in the browser unless asked for.
"""
from __future__ import annotations

from fontTools.varLib.iup import iup_delta

# Simple glyphs: (contour index of the bar, which letter's bar it is). Both ends extend.
BARS: dict[str, list[tuple[int, str]]] = {
    "t": [(1, "t")],
    "T": [(1, "T")],
    "Tcaron": [(1, "T")],
    "t.ss01": [(1, "t")],
    "t_t": [(1, "t")],
}
# Composites whose first component is an edited glyph: the other components move with the stem.
COMPOSITES: dict[str, str] = {
    "tcaron": "t", "uni021B": "t", "tcaron.ss01": "t", "uni021B.ss01": "t",
    "uni021A": "T",
}
EDITED = sorted({*BARS, *COMPOSITES})
# normalised wght at the masters: 100, 500, 900 on the 100-900 axis
MASTERS = (0.0, 0.5, 1.0)
REGIONS = ((0.0, 0.5, 1.0), (0.5, 1.0, 1.0))


def _scalar(region: tuple[float, float, float], w: float) -> float:
    lo, pk, hi = region
    if w == pk:
        return 1.0
    if w <= lo or w >= hi:
        return 0.0
    return (w - lo) / (pk - lo) if w < pk else (hi - w) / (hi - pk)


def _tuples(font, gn: str):
    tvs = font["gvar"].variations[gn]
    if [tv.axes["wght"] for tv in tvs] != list(REGIONS):
        raise SystemExit(f"{gn}: gvar is not the expected two-region wght layout")
    return tvs


class _Master:
    """One glyph's points at the three masters, as plain [x, y] lists (no phantoms)."""

    def __init__(self, font, gn: str):
        glyf = font["glyf"]
        g = glyf[gn]
        self.gn, self.g = gn, g
        self.simple = not g.isComposite()
        if self.simple:
            g.expand(glyf)
            self.base = [list(p) for p in g.coordinates]
            self.ends = list(g.endPtsOfContours)
        else:
            self.base = [[c.x, c.y] for c in g.components]
            self.ends = None
        self.n = len(self.base)
        self.tvs = _tuples(font, gn)
        deltas = []
        for tv in self.tvs:
            d = list(tv.coordinates)
            if self.simple and None in d[: self.n]:
                # iup_delta wants the four phantom points as well; they are only ever touched
                coords = [tuple(p) for p in self.base] + [(0, 0)] * 4
                d = iup_delta([v if v is not None else (0, 0) if i >= self.n else None
                               for i, v in enumerate(d)], coords, self.ends)
            d = [(0, 0) if v is None else tuple(v) for v in d[: self.n]]
            deltas.append(d)
        a, b = deltas
        self.m = [
            [list(p) for p in self.base],
            [[p[0] + q[0], p[1] + q[1]] for p, q in zip(self.base, a)],
            [[p[0] + q[0], p[1] + q[1]] for p, q in zip(self.base, b)],
        ]


def _bar_length(font, gn: str, idx: int) -> list[float]:
    m = _Master(font, gn)
    start = m.ends[idx - 1] + 1 if idx else 0
    pts = range(start, m.ends[idx] + 1)
    return [max(m.m[k][i][0] for i in pts) - min(m.m[k][i][0] for i in pts) for k in range(3)]


def _hvar_row(font, vs, values: list[float]) -> int:
    """Append a (outer << 16 | inner) row to a VarStore for a value measured at the three
    masters; returns the packed index. The row uses the two standard wght regions."""
    ridx = []
    for r in REGIONS:
        for i, reg in enumerate(vs.VarRegionList.Region):
            ax = reg.VarRegionAxis
            if len(ax) == 1 and (ax[0].StartCoord, ax[0].PeakCoord, ax[0].EndCoord) == r:
                ridx.append(i)
                break
        else:
            raise SystemExit("VarStore has no standard wght region")
    d1, d2 = round(values[1] - values[0]), round(values[2] - values[0])
    for outer, vd in enumerate(vs.VarData):
        if sorted(vd.VarRegionIndex) == sorted(ridx):
            order = [vd.VarRegionIndex.index(r) for r in ridx]
            row = [0] * len(vd.VarRegionIndex)
            row[order[0]], row[order[1]] = d1, d2
            vd.Item.append(row)
            vd.ItemCount = len(vd.Item)
            vd.NumShorts = vd.VarRegionCount  # every value of a row stored as int16
            return outer << 16 | (len(vd.Item) - 1)
    raise SystemExit("VarStore has no row layout for the two wght regions")


def _row_values(vs, packed: int, base: float) -> list[float]:
    """The value a VarStore row gives at the three masters."""
    vd = vs.VarData[packed >> 16]
    item = vd.Item[packed & 0xFFFF]
    out = []
    for w in MASTERS:
        v = base
        for r, delta in zip(vd.VarRegionIndex, item):
            reg = vs.VarRegionList.Region[r].VarRegionAxis[0]
            v += delta * _scalar((reg.StartCoord, reg.PeakCoord, reg.EndCoord), w)
        out.append(v)
    return out


def widen_bars(font, percent: float) -> dict:
    """Edit `font` (the Latin VF, loaded from Outfit) in place. Returns a record of the per-master
    extension and the glyphs touched."""
    glyf, hmtx, hvar = font["glyf"], font["hmtx"], font["HVAR"].table
    gpos_anchors = _anchors(font)
    # extension of one end, per master, from each letter's own bar
    ext = {kind: [percent / 200 * L for L in _bar_length(font, kind, 1)] for kind in ("t", "T")}

    # decompile everything we read before anything changes
    masters = {gn: _Master(font, gn) for gn in EDITED}
    new_masters: dict[str, list] = {}
    shifts: dict[str, list[float]] = {}   # the stem's shift per master, for components and anchors
    total: dict[str, list[float]] = {}    # added advance per master

    for gn, spec in BARS.items():
        m = masters[gn]
        kind = spec[0][1]
        e = ext[kind]
        # events from the default master's geometry: ("L"|"R", x) of each bar
        events: list[tuple[str, float]] = []
        bar_pts: set[int] = set()
        for idx, _ in spec:
            start = m.ends[idx - 1] + 1 if idx else 0
            pts = list(range(start, m.ends[idx] + 1))
            bar_pts.update(pts)
            xs = [m.m[0][i][0] for i in pts]
            events += [("L", min(xs)), ("R", max(xs))]
        # which events lie before each point (decided once, on the default master)
        before: list[tuple[int, int]] = []   # per point: (left events counted, right events counted)
        start = 0
        for end in m.ends:
            pts = list(range(start, end + 1))
            cx = min(m.m[0][i][0] for i in pts)
            for i in pts:
                ref = m.m[0][i][0] if i in bar_pts else cx
                nl = sum(1 for k, x in events if k == "L" and x < ref)
                nr = sum(1 for k, x in events if k == "R" and x <= ref)
                before.append((nl, nr))
            start = end + 1
        out = []
        for k in range(3):
            out.append([[p[0] + (nl + nr) * e[k], p[1]] for p, (nl, nr) in zip(m.m[k], before)])
        new_masters[gn] = out
        shifts[gn] = list(e)
        total[gn] = [2 * v for v in e]
    for gn, kind in COMPOSITES.items():
        m = masters[gn]
        e = ext[kind]
        out = []
        for k in range(3):
            out.append([m.m[k][0][:]] + [[p[0] + e[k], p[1]] for p in m.m[k][1:]])
        new_masters[gn] = out
        shifts[gn] = list(e)
        total[gn] = [2 * v for v in e]

    for gn in EDITED:
        m = masters[gn]
        nm = [[[round(x), round(y)] for x, y in mk] for mk in new_masters[gn]]
        # advance at each master, from HVAR
        packed = hvar.AdvWidthMap.mapping[gn]
        adv0, lsb = hmtx[gn]
        adv = _row_values(hvar.VarStore, packed, adv0)
        adv_new = [round(a + t) for a, t in zip(adv, total[gn])]
        # default outline / component offsets
        if m.simple:
            m.g.coordinates = type(m.g.coordinates)([tuple(p) for p in nm[0]])
        else:
            for c, p in zip(m.g.components, nm[0]):
                c.x, c.y = p
        # gvar: explicit deltas for the two tuples
        for tv, k in zip(m.tvs, (1, 2)):
            d = [(nm[k][i][0] - nm[0][i][0], nm[k][i][1] - nm[0][i][1]) for i in range(m.n)]
            ph = list(tv.coordinates[m.n: m.n + 4])
            ph[1] = (adv_new[k] - adv_new[0], 0)
            tv.coordinates = d + [(0, 0) if v is None else v for v in ph]
        hmtx[gn] = (adv_new[0], lsb)
        hvar.AdvWidthMap.mapping[gn] = _hvar_row(font, hvar.VarStore, adv_new)

    _shift_anchors(font, gpos_anchors, shifts)
    # bounds and lsb follow the new outlines
    for gn in EDITED:
        g = glyf[gn]
        g.recalcBounds(glyf)
        hmtx[gn] = (hmtx[gn][0], g.xMin if g.numberOfContours else 0)
    return {"percent": percent, "glyphs": EDITED,
            "extension_units_per_end": {k: [round(v, 2) for v in e] for k, e in ext.items()}}


# ---------------------------------------------------------------- GPOS mark anchors

def _anchors(font) -> dict[str, list]:
    """Every base and ligature anchor of the edited glyphs: gn -> [(anchor, component index)]."""
    gp = font["GPOS"].table
    out: dict[str, list] = {gn: [] for gn in EDITED}
    for lk in gp.LookupList.Lookup:
        for st in lk.SubTable:
            st = getattr(st, "ExtSubTable", st)
            if st.LookupType == 4:
                names = st.BaseCoverage.glyphs
                for gn in EDITED:
                    if gn in names:
                        rec = st.BaseArray.BaseRecord[names.index(gn)]
                        out[gn] += [(a, 0) for a in rec.BaseAnchor if a is not None]
            elif st.LookupType == 5:
                names = st.LigatureCoverage.glyphs
                for gn in EDITED:
                    if gn in names:
                        att = st.LigatureArray.LigatureAttach[names.index(gn)]
                        for ci, comp in enumerate(att.ComponentRecord):
                            out[gn] += [(a, ci) for a in comp.LigatureAnchor if a is not None]
    return out


def _shift_anchors(font, anchors: dict[str, list], shifts: dict[str, list[float]]) -> None:
    vs = font["GDEF"].table.VarStore
    seen: set[int] = set()
    for gn, lst in anchors.items():
        e = shifts[gn]
        for a, _ci in lst:
            if id(a) in seen:
                raise SystemExit(f"{gn}: anchor object shared between glyphs")
            seen.add(id(a))
            dev = getattr(a, "XDeviceTable", None)
            if dev is None or dev.DeltaFormat != 0x8000:
                raise SystemExit(f"{gn}: mark anchor without a variation index")
            packed = dev.StartSize << 16 | dev.EndSize
            vals = _row_values(vs, packed, a.XCoordinate)
            new = [v + s for v, s in zip(vals, e)]
            a.XCoordinate = round(new[0])
            row = _hvar_row(font, vs, [round(v) for v in new])
            dev.StartSize, dev.EndSize = row >> 16, row & 0xFFFF
