"""The drawn italic of Altruvex Sans Latin: dist/web/AltruvexSansLatin-Italic-{300,400,500,700}.woff2
and dist/italic-report.json.

Usage: uv run python tools/italic.py   (after tools/build.py; it reads the built upright)

The lowercase is drawn here, not slanted: cursive a, e, f, g, y, j, the exit strokes of a, d, h,
i, l, m, n, t, u, and an s taken from the centreline of the upright s. One skeleton, drawn for 300,
is mapped onto each weight's upright proportions, sheared to 12 degrees and only then stroked, so a
round keeps one stroke width all the way round; the outline is written as quadratic curves.
Capitals, figures and punctuation are the upright slanted with an optical correction. The accented
letters are rebuilt on the drawn bases, kerning is remapped for the letters whose sides changed,
and pairs that collide are kerned apart.

Measures behind the spacing (step 4, 2026-10-03): a letter that ends in an exit keeps about 12
units more white on its right than its upright; e gives back 12 for its open side; tt is kerned
to the upright's gap plus 12; brackets, quotes and marks that rise to the ascender keep 40 units
from any letter. At 700 the drawn s notches, so 700 uses the slanted upright s.
"""
import copy
import math
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.basePen import BasePen
from fontTools.otlLib.builder import buildPairPosGlyphsSubtable, buildValue
from shapely.geometry import LineString, LinearRing, Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
from shapely import affinity
from fontTools.varLib.instancer import instantiateVariableFont
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPRIGHT = ROOT / "dist/web/AltruvexSansLatin-VF.woff2"
OUT = ROOT / "dist/web"
REPORT = ROOT / "dist/italic-report.json"
W = 35  # half the stem of the 300 drawing
XH = 470
ANGLE = 12
SH = math.tan(math.radians(ANGLE))
PIVOT = XH / 2  # the shear pivots at half the x-height so a glyph stays in its advance
WEIGHTS = (300, 400, 500, 700)
shx = lambda x, y: x + (y - PIVOT) * SH


# ---------------------------------------------------------------- outlines as shapes

class Flat(BasePen):
    def __init__(s, gs=None):
        super().__init__(gs); s.c = []

    def _moveTo(s, p): s.c.append([p])
    def _lineTo(s, p): s.c[-1].append(p)

    def _curveToOne(s, a, b, c):
        p0 = s._getCurrentPoint()
        s.c[-1] += [tuple((1 - t) ** 3 * p0[j] + 3 * t * (1 - t) ** 2 * a[j] + 3 * t * t * (1 - t) * b[j] + t ** 3 * c[j] for j in (0, 1)) for t in (i / 16 for i in range(1, 17))]

    def _qCurveToOne(s, a, b):
        p0 = s._getCurrentPoint()
        s.c[-1] += [tuple((1 - t) ** 2 * p0[j] + 2 * t * (1 - t) * a[j] + t * t * b[j] for j in (0, 1)) for t in (i / 16 for i in range(1, 17))]


def shape(font, gn):
    """A glyph as one shapely geometry. TrueType draws ink clockwise and counters the other way."""
    gs = font.getGlyphSet(); fl = Flat(gs); gs[gn].draw(fl)
    ink, holes = [], []
    for c in fl.c:
        if len(c) > 1 and c[0] == c[-1]:
            c = c[:-1]
        if len(c) < 3:
            continue
        (holes if LinearRing(c).is_ccw else ink).append(Polygon(c).buffer(0))
    return unary_union(ink).difference(unary_union(holes)) if ink else Polygon()


# ---------------------------------------------------------------- the 300 drawing

def arc(cx, cy, rx, ry, a0, a1, n=48):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def stroke(pts, lo=None, hi=None, w=W, ring=False):
    return ("ring" if ring else "line", pts, lo, hi, w)


def mitre(pts, w=W, lo=0, hi=XH, kind="mitre"):
    """One pen path with sharp corners, so two diagonals meet in a clean vertex."""
    return (kind, pts, lo, hi, w)


def tail(x, top):
    """A stem that leaves the baseline in an exit stroke. The third number of a point is a
    distance from the stem, which every letter scales the same way, so all exits match."""
    return [(x, top), (x, 140, 0)] + [(x, 140 + 115 * math.sin(math.radians(a)), 80 + 80 * math.cos(math.radians(a)))
                                   for a in (180 + 135 * i / 48 for i in range(1, 49))]


def hook(x):
    """The descending hook shared by g and y."""
    return [(x, 510), (x, 19)] + arc(x - 212, 19, 212, 194, 0, -150)[1:]


BOWL_A = stroke(arc(278, 235, 201, 210, 0, 360), ring=True)
BOWL_G = stroke(arc(277, 243, 201, 204, 0, 360), ring=True)
F_TOP = arc(309.5, 550, 134, 134, 44, 180)
# The upright t has a longer crossbar (tools/glyph_edits.py); the drawn t follows it: the bar keeps
# its left end, the stem and the right end move by one and two extensions of the 307-unit bar.
import config as _config
_bw = _config.load().bar_widening
T_EXT = _bw.percent / 200 * 307 if _bw else 0.0
bar = lambda x0, x1: ("bar", [(x0, 438.5), (x1, 438.5)], None, None, 31.5)


def diag(top_x, bot_x, lo=0, hi=XH, w=W):
    k = (top_x - bot_x) / XH
    return stroke([(bot_x + k * (hi + 40), hi + 40), (bot_x + k * (lo - 40), lo - 40)], lo, hi, w)


def stem(x, lo=0, hi=XH):
    return stroke([(x, lo - 40), (x, hi + 40)], lo, hi)


def glyphs():
    leg = lambda x, top, hi: stroke(tail(x, top), hi=hi)
    arch = lambda cx, r: arc(cx, 282, r, 165.5, 180, 0)
    u_cup = [(94, 510), (94, 197)] + arc(257, 197, 163, 173, 180, 360)[1:] + [(420, 510)]
    ring_b = stroke(arc(306.5, 235, 200.5, 210.5, 0, 360), ring=True)  # its left edge sits on the stem, not past it
    dot = lambda x: ("dot", (x, 621), None, None, 48.5)
    i_stem, j_stem = leg(106.5, 510, XH), stroke(
        # the hook grows with the stroke like an exit does, so it keeps an inside in the bold
        [(112, 510), (112, -58)] + [(112, y, x - 112, -58) for x, y in arc(-2, -58, 114, 117, 0, -152)[1:]], hi=XH)
    # letter: (strokes, exit, how its x is mapped onto a weight)
    return {
        "a": ([BOWL_A, stroke(tail(479, 510), hi=XH)], True, "a"),
        "b": ([stem(106, 0, 708), ring_b], False, "b"),
        "c": ([stroke(arc(285, 235, 208.5, 210.5, 43, 317))], False, "c"),
        "d": ([BOWL_A, leg(479, 750, 708)], True, "d"),
        "e": ([("inring", [(79, 190), (480, 306.7)], (271, 235, 196, 210), None, 30), stroke(arc(271, 235, 196, 210, 9, 324))], False, "e"),
        "f": ([stroke(F_TOP + [(175.5, -40)] + arc(65.5, -40, 110, 134, 0, -130)[1:]), bar(22, 368)], False, "f"),
        "g": ([BOWL_G, stroke(hook(477), hi=XH)], False, "g"),
        "h": ([stem(106, 0, 708), stroke(arch(277, 171.5) + tail(448.5, 282)[1:])], True, "h"),
        "i": ([i_stem, dot(106.5)], True, "|i"),
        "dotlessi": ([i_stem], True, "|i"),
        "j": ([j_stem, dot(112)], False, "|j"),
        "uni0237": ([j_stem], False, "|j"),
        "l": ([leg(106, 750, 708)], True, "|l"),
        "m": ([stem(106), stroke(arch(267.75, 161.75) + [(429.5, -40)], lo=0), stroke(arch(591.25, 161.75) + tail(753, 282)[1:])], True, "m"),
        "n": ([stem(106), stroke(arch(277, 171.5) + tail(448.5, 282)[1:])], True, "n"),
        "o": ([stroke(arc(284, 235, 208.5, 210.5, 0, 360), ring=True)], False, "o"),
        "p": ([stem(106, -198, XH), ring_b], False, "p"),
        "q": ([BOWL_A, stem(479.5, -198, XH)], False, "q"),
        "r": ([stem(106), stroke(arc(270, 282, 164, 165, 180, 50))], False, "r"),
        "s": ("s", False, "s"),
        "t": ([leg(179 + T_EXT, 710, 668), bar(25, 332 + 2 * T_EXT)], True, "|t"),
        "u": ([stroke(u_cup, hi=XH), leg(420, 510, XH)], True, "u"),
        "y": ([stroke(u_cup, hi=XH), stroke(hook(420), hi=XH)], "g", "u"),  # u on the left, g on the right
    }


# Accented letters that the upright stores as one flat outline: the drawn base plus the
# upright's own accent, which is every contour that sits wholly above the x-height.
FLAT_ACCENTED = {"uni01CE": "a", "ccaron": "c", "ecaron": "e", "uni0123": "g", "imacron": "dotlessi", "ncaron": "n",
                 "ohungarumlaut": "o", "rcaron": "r", "scaron": "s", "uhungarumlaut": "u"}
# Composites of two letters, which the drawn bases would not fit: they stay sloped romans.
DECOMPOSE = {"ae", "oe", "oe.ss01", "ij"}


# ---------------------------------------------------------------- one weight's measures

def cut(geom, a, b):
    """The pieces of the line a-b that lie in the ink, as (start, end) along the cut's long axis."""
    hit = geom.intersection(LineString([a, b])); ax = 0 if a[1] == b[1] else 1
    segs = [g for g in getattr(hit, "geoms", [hit]) if g.geom_type == "LineString"]
    return sorted((min(p[ax] for p in s.coords), max(p[ax] for p in s.coords)) for s in segs)


class Measures:
    def __init__(s, w):
        s.w = w; s.font = f = upright(w); glyf = f["glyf"]; s.cm = f.getBestCmap()
        g = lambda ch: glyf[s.cm[ord(ch)]]
        s.b = {ch: (g(ch).xMin, g(ch).xMax) for ch in "abcdefghijklmnopqrstuvwxyz"}
        s.adv = {gn: f["hmtx"][gn][0] for gn in f.getGlyphOrder()}
        s.h = (g("l").xMax - g("l").xMin) / 2
        s.xh, s.omax, s.omin, s.asc = g("u").yMax, g("o").yMax, g("o").yMin, g("l").yMax
        s.ftop, s.ttop, s.desc, s.gmin = g("f").yMax, g("t").yMax, g("p").yMin, g("g").yMin
        s.stem = {}
        for ch in "ijltf":
            x0, x1 = cut(shape(f, ch), (-500, 200), (1500, 200))[0]; s.stem[ch] = (x0 + x1) / 2
        tb = g("t"); y0, y1 = cut(shape(f, "t"), (tb.xMin + 12, 250), (tb.xMin + 12, 900))[0]
        s.bar = (y1 - y0) / 2
        eb = g("e"); mid = (eb.xMin + eb.xMax) / 2; s.ebar = cut(shape(f, "e"), (mid, -100), (mid, 900))[1]
        dot = max(_contours(f, "i"), key=lambda c: min(p[1] for p in c))
        ys = [p[1] for p in dot]; s.dot_r, s.dot_y = (max(ys) - min(ys)) / 2, (max(ys) + min(ys)) / 2


def _contours(font, gn):
    gs = font.getGlyphSet(); fl = Flat(gs); gs[gn].draw(fl); return fl.c


def interp(anchors, v):
    """Piecewise linear through the anchors; past either end it carries on at slope one."""
    if v <= anchors[0][0]:
        return anchors[0][1] + v - anchors[0][0]
    for (a0, b0), (a1, b1) in zip(anchors, anchors[1:]):
        if v <= a1:
            return b0 + (v - a0) * (b1 - b0) / (a1 - a0)
    return anchors[-1][1] + v - anchors[-1][0]


class Mapper:
    """Carries a point of the 300 drawing to the same place in another weight. Heights follow
    that weight's own lines (a centreline sits half a stem inside them); widths follow the
    upright letter's bounds, so a letter keeps the room the upright gives it."""

    def __init__(s, m3, m):
        s.m3, s.m, s.h = m3, m, m.h
        s.cy = [(m3.gmin + W, m.gmin + m.h), (m3.omin + W, m.omin + m.h), (m3.omax - W, m.omax - m.h), (m3.ftop - W, m.ftop - m.h)]
        s.edge = [(m3.desc, m.desc), (0, 0), (m3.xh, m.xh), (m3.ttop, m.ttop), (m3.asc, m.asc)]
        s.bar = m.bar / m3.bar
        s.kn = s.k("n")
        s.exit = max(80 * s.kn, 1.5 * m.h) / 80  # a bold exit still needs an inside to its curve
        # the room an exit adds to its letter: enough for the next stem to clear the stroke's end
        # the gap is set so an exit letter keeps about 12 more white on its right than the upright
        # (step 4); a bold exit reaches further, so its clearance to the next stem shrinks
        reach, gap = s.exit * 136.6 + 0.71 * m.h, interp([(35, 36), (45, 30), (55, 22), (76.5, -16)], m.h)
        s.room = reach + gap - (m.adv["n"] - s.x("n", 448.5)) - m.b["l"][0]

    def k(s, ch):
        (a0, a1), (b0, b1) = s.m3.b[ch], s.m.b[ch]
        return (b1 - b0 - 2 * s.h) / (a1 - a0 - 2 * W)

    def y(s, v, curl=False, at=25):
        # an exit's curve grows with its width, so its inside stays round in the bold;
        # `at` is where the curve leaves its stem
        return interp(s.cy, at) + (v - at) * s.exit if curl else interp(s.cy, v)
    def clip(s, v): return None if v is None else interp(s.edge, v)

    def x(s, how, px, dx=0):
        if how[0] == "|":  # a letter that hangs on one stem
            ch = how[1]
            return s.m.stem[ch] + (px - s.m3.stem[ch]) * (s.kn if ch == "j" else 1) + dx * s.exit
        if how == "f":  # the stem is the upright's; the hook reaches the upright's right edge
            tip3, tip = s.m3.b["f"][1] - 0.72 * W, s.m.b["f"][1] - 0.72 * s.h
            kf = (tip - s.m.stem["f"]) / (tip3 - s.m3.stem["f"])
            return s.m.stem["f"] + (px - s.m3.stem["f"]) * kf
        (a0, _), (b0, _) = s.m3.b[how], s.m.b[how]
        return b0 + s.h + (px - a0 - W) * s.k(how) + dx * s.exit

    def outer(s, ch, px):  # for a bar, whose ends are the letter's own edges
        (a0, a1), (b0, b1) = s.m3.b[ch], s.m.b[ch]
        return b0 + (px - a0) * (b1 - b0) / (a1 - a0)

    def bar_y(s, py, w):  # a bar keeps its outer edge on its line
        w2 = w * s.bar
        return (s.clip(py + w) - w2) if py > PIVOT else (s.clip(py - w) + w2)


# ---------------------------------------------------------------- s from the upright centreline

def s_shape(m):
    """The upright s is one stroke with two cut ends. Its two long sides are paired point to
    nearest point; halfway between is the centreline and half the gap is the pen there. The
    centreline is sheared and the same pen is laid back along it, so the slanted s keeps the
    upright's proportions and its stroke, where a sheared outline would thin one diagonal."""
    c = _contours(m.font, "s")[0]
    if c[0] == c[-1]:
        c = c[:-1]
    n = len(c)
    def turn(i):
        a, b, d = c[i - 1], c[i], c[(i + 1) % n]
        return abs(math.degrees(math.atan2((b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]),
                                           (b[0] - a[0]) * (d[0] - b[0]) + (b[1] - a[1]) * (d[1] - b[1]))))
    corners = [i for i in range(n) if turn(i) > 40]
    assert len(corners) == 4, corners
    runs = []
    for a, b in zip(corners, corners[1:] + [corners[0] + n]):
        runs.append([c[i % n] for i in range(a, b + 1)])
    A, B = sorted(runs, key=lambda r: -LineString(r).length)[:2]
    B = B[::-1]
    la, lb = LineString(A), LineString(B)
    mid = lambda p, q: ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    pts = [(mid(A[0], B[0]), math.dist(A[0], B[0]) / 2)]
    # The partner is looked for only near the same place along the stroke: in a bold s the
    # nearest point of all can lie across the counter, on the other bowl.
    Bs = [lb.interpolate(i / 600, normalized=True) for i in range(601)]
    i = 0
    for k in range(1, 120):
        a = la.interpolate(k / 120, normalized=True)
        i = min(range(i, min(600, i + 90) + 1), key=lambda j: a.distance(Bs[j]))
        if 0 < i < 600:  # where a side runs past the other's end there is no pair
            b = Bs[i]; pts.append((((a.x + b.x) / 2, (a.y + b.y) / 2), a.distance(b) / 2))
    pts.append((mid(A[-1], B[-1]), math.dist(A[-1], B[-1]) / 2))
    line = LineString([p for p, _ in pts]); at = [line.project(Point(p)) for p, _ in pts]
    N = 72; C = []; R = []
    for k in range(N + 1):
        d = line.length * k / N; p = line.interpolate(d); C.append((p.x, p.y))
        j = max(i for i in range(len(at)) if at[i] <= d + 1e-6); j = min(j, len(at) - 2)
        u = (d - at[j]) / max(at[j + 1] - at[j], 1e-6); R.append(pts[j][1] * (1 - u) + pts[j + 1][1] * u)
    R = [sum(R[max(0, i - 2):i + 3]) / len(R[max(0, i - 2):i + 3]) for i in range(len(R))]
    def laid(sh):
        P = [(x + (y - PIVOT) * sh, y) for x, y in C]; L, Rt = [], []
        for i, (x, y) in enumerate(P):
            (x0, y0), (x1, y1) = P[max(i - 1, 0)], P[min(i + 1, N)]
            d = math.hypot(x1 - x0, y1 - y0); nx, ny = -(y1 - y0) / d, (x1 - x0) / d
            L.append((x + nx * R[i], y + ny * R[i])); Rt.append((x - nx * R[i], y - ny * R[i]))
        return Polygon(L + Rt[::-1]).buffer(0)
    return laid(SH), laid(0).symmetric_difference(shape(m.font, "s")).area / shape(m.font, "s").area


# ---------------------------------------------------------------- polygons to curves

def fit_ring(P, tol=0.45):
    """A drawn outline arrives as a many-sided polygon. This writes it as lines and quadratic
    curves: a vertex that turns sharply is a corner and stays one, the runs between corners are
    curves, and a curve is accepted only while it stays within `tol` of the polygon."""
    Q = [P[0]]
    for p in P[1:]:
        if math.dist(p, Q[-1]) > 0.3:
            Q.append(p)
    if math.dist(Q[0], Q[-1]) <= 0.3:
        Q.pop()
    P = Q; n = len(P)
    U, L = [], []
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]; d = math.dist(a, b); U.append(((b[0] - a[0]) / d, (b[1] - a[1]) / d)); L.append(d)
    ang = lambda a, b: math.degrees(math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]))
    norm = lambda v: (v[0] / math.hypot(*v), v[1] / math.hypot(*v))
    corner = [abs(ang(U[i - 1], U[i])) > 18 for i in range(n)]

    # A curve's furthest points must be points of the outline, or the glyph's box is measured
    # from control points that sit outside the ink.
    ext = {}
    for i in range(n):
        if corner[i]: continue
        for ax in (0, 1):
            a, b, d = P[i - 1][ax], P[i][ax], P[(i + 1) % n][ax]
            if (b > a and b >= d) or (b < a and b <= d):
                t = U[i - 1][1 - ax] + U[i][1 - ax]
                ext[i] = (0, math.copysign(1, t)) if ax == 0 else (math.copysign(1, t), 0)

    def smooth(i):  # the tangent at a vertex inside a curve; a long straight side sets it alone
        if i in ext: return ext[i]
        a, b, la, lb = U[i - 1], U[i], L[i - 1], L[i]
        if la > 3 * lb: return a
        if lb > 3 * la: return b
        return norm((a[0] * lb + b[0] * la, a[1] * lb + b[1] * la))

    def one_sided(a, b, la, lb):  # the tangent at a corner, looking only into the run
        if la > 3 * lb or lb > 3 * la: return a
        k = la / (la + lb); return norm((a[0] + (a[0] - b[0]) * k, a[1] + (a[1] - b[1]) * k))

    def leave(i, j):
        if not corner[i % n]: return smooth(i % n)
        return U[i % n] if j - i < 2 else one_sided(U[i % n], U[(i + 1) % n], L[i % n], L[(i + 1) % n])

    def arrive(i, j):
        if not corner[j % n]: return smooth(j % n)
        return U[(j - 1) % n] if j - i < 2 else one_sided(U[(j - 1) % n], U[(j - 2) % n], L[(j - 1) % n], L[(j - 2) % n])

    out = []

    def rec(i, j, Ti, Tj):
        p0, p2 = P[i % n], P[j % n]
        if j - i == 1:
            out.append(("L", p2)); return
        run = [P[k % n] for k in range(i, j + 1)]
        cr = Ti[0] * Tj[1] - Ti[1] * Tj[0]; dx, dy = p2[0] - p0[0], p2[1] - p0[1]
        if abs(cr) > 1e-3 and abs(ang(Ti, Tj)) < 80:
            s, t = (dx * Tj[1] - dy * Tj[0]) / cr, (Ti[0] * dy - Ti[1] * dx) / cr
            if s > 0 and t > 0:
                c = (p0[0] + s * Ti[0], p0[1] + s * Ti[1])
                q = [((1 - u) ** 2 * p0[0] + 2 * u * (1 - u) * c[0] + u * u * p2[0], (1 - u) ** 2 * p0[1] + 2 * u * (1 - u) * c[1] + u * u * p2[1]) for u in (k / 16 for k in range(17))]
                pl, ql = LineString(run), LineString(q)
                if max(pl.distance(Point(x)) for x in q) <= tol and max(ql.distance(Point(x)) for x in run[1:-1]) <= tol:
                    out.append(("Q", c, p2)); return
        elif abs(cr) <= 1e-3:
            chord = LineString([p0, p2])
            if max(chord.distance(Point(x)) for x in run[1:-1]) <= tol / 2:
                out.append(("L", p2)); return
        acc, half, best, m = 0, sum(L[k % n] for k in range(i, j)) / 2, 1e9, i + 1
        for k in range(i, j - 1):
            acc += L[k % n]
            if abs(acc - half) < best:
                best, m = abs(acc - half), k + 1
        Tm = smooth(m % n); rec(i, m, Ti, Tm); rec(m, j, Tm, Tj)

    anchors = [i for i in range(n) if corner[i] or i in ext] or [0]
    for a, b in zip(anchors, anchors[1:] + [anchors[0] + n]):
        rec(a, b, leave(a, b), arrive(a, b))
    return P[anchors[0]], out


def draw_curves(poly, pen):
    rnd = lambda p: (round(p[0]), round(p[1]))
    for pg in getattr(poly, "geoms", [poly]):
        pg = orient(pg, -1)
        for r in [pg.exterior, *pg.interiors]:
            start, segs = fit_ring(list(r.coords)[:-1])
            pen.moveTo(rnd(start))
            for sg in segs:
                pen.lineTo(rnd(sg[1])) if sg[0] == "L" else pen.qCurveTo(rnd(sg[1]), rnd(sg[2]))
            pen.closePath()


# ---------------------------------------------------------------- sheared outlines

def optical(g, sh, t):
    """Give a sheared outline its stroke width back. A shear leaves horizontals alone, thins what
    leans with the slope and thickens what leans against it: a stroke whose edge runs along the
    unit vector u is |S^-1 u| times its drawn width. Each edge moves along its normal by half of
    what was lost or gained; TrueType keeps the ink on the right of travel, so left is outward."""
    pts = list(g.coordinates); out = list(pts); start = 0
    for end in g.endPtsOfContours:
        c = pts[start:end + 1]; n = len(c); off = []
        for i in range(n):
            (x0, y0), (x1, y1) = c[i], c[(i + 1) % n]
            dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy)
            if L < 6:  # a doubled point or a corner bevel has no direction of its own; it takes its neighbour's below
                off.append(None); continue
            ux, uy = dx / L, dy / L
            off.append(((-uy, ux), t / 2 * (1 - math.hypot(ux - sh * uy, uy))))
        if all(o is None for o in off):
            start = end + 1; continue
        for i in range(2 * n):
            if off[i % n] is None:
                off[i % n] = off[(i - 1) % n]
        for i in range(n):
            (n1, d1), (n2, d2) = off[i - 1], off[i]
            cr = n1[0] * n2[1] - n1[1] * n2[0]
            if abs(cr) < 0.25:
                mx, my = n1[0] + n2[0], n1[1] + n2[1]; m = math.hypot(mx, my) or 1
                ox, oy = (d1 + d2) / 2 * mx / m, (d1 + d2) / 2 * my / m
            else:
                ox, oy = (d1 * n2[1] - d2 * n1[1]) / cr, (n1[0] * d2 - n2[0] * d1) / cr
                lim = 1.5 * max(abs(d1), abs(d2))  # a sharp corner must not throw its point far
                m = math.hypot(ox, oy)
                if m > lim and m > 0:
                    ox, oy = ox * lim / m, oy * lim / m
            out[start + i] = (round(c[i][0] + ox), round(c[i][1] + oy))
        start = end + 1
    # Overlapping contours meet in shared points; each contour would move its copy its own way
    # and open a spur between them, so a shared point stays where it is.
    seen = {}
    for p in pts:
        seen[p] = seen.get(p, 0) + 1
    for i, p in enumerate(out):
        g.coordinates[i] = pts[i] if seen[pts[i]] > 1 else p


# ---------------------------------------------------------------- kerning

Y_FORMS = ["y", "yacute", "ycircumflex", "ydieresis", "ygrave"]
CHECK = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?'\"()-–—/’‘“”[]{}*"
# Brackets, quotes and marks that rise to the ascender: the hook of f and the tails of j, g, y
# reach over or under them, so beside a letter they keep a clear gap of their own.
CLEAR, CLEAR_GAP = "()[]{}!?/'\"’‘“”*", 40


class Kern:
    """The kern lookup: exact pairs first, then classes."""

    def __init__(s, font):
        s.font = font; s.lookup = font["GPOS"].table.LookupList.Lookup[0]
        st1, s.st2 = s.lookup.SubTable
        assert st1.Format == 1 and s.st2.Format == 2
        s.pairs = {(g1, r.SecondGlyph): r.Value1.XAdvance for g1, ps in zip(st1.Coverage.glyphs, st1.PairSet) for r in ps.PairValueRecord}

    def value(s, a, b):
        if (a, b) in s.pairs:
            return s.pairs[(a, b)]
        if a in s.st2.Coverage.glyphs:
            rec = s.st2.Class1Record[s.st2.ClassDef1.classDefs.get(a, 0)].Class2Record[s.st2.ClassDef2.classDefs.get(b, 0)]
            return rec.Value1.XAdvance or 0
        return 0

    def remap_y(s):
        """y is now a u with a g's descender: it kerns as u on its left and as g on its right.
        The pairs written for the old v-shaped y would pull letters into the new one."""
        firsts = {a for a, _ in s.pairs}
        for (a, b), v in list(s.pairs.items()):
            if a in Y_FORMS or b in Y_FORMS:
                del s.pairs[(a, b)]
        for (a, b), v in list(s.pairs.items()):
            if b == "u":
                for y in Y_FORMS: s.pairs[(a, y)] = v
            if a == "g":
                for y in Y_FORMS: s.pairs[(y, b)] = v
        c1, c2, cov = s.st2.ClassDef1.classDefs, s.st2.ClassDef2.classDefs, s.st2.Coverage.glyphs
        for y in Y_FORMS:
            c2[y] = c2["u"]
            if "g" in cov:
                c1[y] = c1.get("g", 0)
                if y not in cov: cov.append(y)
            elif y in cov:
                cov.remove(y); c1.pop(y, None)
        cov.sort(key=s.font.getGlyphID)

    def write(s):
        pairs = {k: (buildValue({"XAdvance": v}), None) for k, v in s.pairs.items()}
        s.lookup.SubTable[0] = buildPairPosGlyphsSubtable(pairs, s.font.getReverseGlyphMap())


def gaps(font, kern):
    """The clear distance between the two letters of every pair, as they are set."""
    cm = font.getBestCmap(); names = [cm[ord(c)] for c in CHECK if ord(c) in cm]
    shp = {g: shape(font, g) for g in names}; adv = {g: font["hmtx"][g][0] for g in names}
    return shp, adv, names, {(a, b): shp[a].distance(affinity.translate(shp[b], adv[a] + kern.value(a, b))) for a in names for b in names}


# ---------------------------------------------------------------- build

def build(weight, m3, correct=True, suffix=""):
    m = Measures(weight); mp = Mapper(m3, m); h = m.h
    f = upright(weight)
    gs, glyf = f.getGlyphSet(), f["glyf"]
    shear = (1, 0, SH, 1, -SH * PIVOT, 0)
    drawing = glyphs(); new = {}; up_adv = dict(m.adv); report = {}
    for gn in f.getGlyphOrder():
        g = glyf[gn]
        if g.isComposite() and gn not in DECOMPOSE and not any(hasattr(c, "transform") for c in g.components):
            g2 = copy.deepcopy(g)  # its parts are slanted already; only a raised part moves across
            for c in g2.components:
                c.x = round(c.x + c.y * SH)
            new[gn] = g2; continue
        pen = TTGlyphPen(None); rec = DecomposingRecordingPen(gs); gs[gn].draw(rec)
        rec.replay(TransformPen(pen, shear)); new[gn] = pen.glyph()
        if correct and gn not in drawing and new[gn].numberOfContours > 0:
            optical(new[gn], SH, 2 * h)

    polys = {}
    for gn, (strokes, ex, how) in drawing.items():
        if strokes == "s":
            poly, report["s vs upright"] = s_shape(m)
            if report["s vs upright"] > 0.02:
                # In the bold the pen is wider than the turns it follows and the laid stroke
                # folds over itself. There the s stays a sloped roman, corrected like the capitals.
                optical(new[gn], SH, 2 * h); report["s"] = "sloped roman"; continue
            else:
                polys[gn] = poly
        else:
            parts = []
            for kind, pts, lo, hi, w in strokes:
                ww = h if w == W else w * mp.bar if kind == "bar" else w * (m.ebar[1] - m.ebar[0]) / (m3.ebar[1] - m3.ebar[0]) if kind == "inring" else w * h / W
                if kind == "dot":
                    parts.append(Point(shx(mp.x(how, pts[0]), m.dot_y), m.dot_y).buffer(m.dot_r, 24)); continue
                if kind in ("bar", "zbar"):
                    p = [(mp.outer(how[-1], q[0]), mp.bar_y(q[1], w)) for q in pts]
                else:
                    p = [(mp.x(how, *((q[0],) + tuple(q[2:3]))), mp.y(q[1], len(q) > 2, *q[3:])) for q in pts]
                p = [(shx(x, y), y) for x, y in p]
                if kind == "inring":  # a bar that stops at the outer edge of its bowl
                    # it climbs less as the weight grows, or the bold eye above it closes
                    t = min(1, max(0, (h - W) / (76.5 - W))); ym = (p[0][1] + p[-1][1]) / 2
                    p = [(x, ym + (y - ym) * (1 - 0.45 * t)) for x, y in p]
                    ring = [(shx(mp.x(how, x), mp.y(y)), mp.y(y)) for x, y in arc(*lo, 0, 360)]
                    parts.append(LineString(p).buffer(ww, cap_style=2).intersection(Polygon(ring).buffer(h))); continue
                if kind in ("mitre", "zbar"):
                    sh_ = LineString(p).buffer(ww, cap_style=2, join_style=2, mitre_limit=8)
                else:
                    sh_ = (LinearRing(p) if kind == "ring" else LineString(p)).buffer(ww, 12, cap_style=2, join_style=1)
                lo, hi = mp.clip(lo), mp.clip(hi)
                if lo is not None or hi is not None:
                    sh_ = sh_.intersection(box(-2000, -2000 if lo is None else lo, 3000, 2000 if hi is None else hi))
                parts.append(sh_)
            polys[gn] = unary_union(parts).simplify(0.05)
        adv = up_adv[gn]
        if how == "|j":  # the grown hook reaches further left; the letter moves over to make room
            grow = 114 * (mp.exit - mp.kn)
            if grow > 0:
                polys[gn] = affinity.translate(polys[gn], grow); adv += grow
        pen = TTGlyphPen(None); draw_curves(polys[gn], pen); new[gn] = pen.glyph()
        if ex is True:
            adv += mp.room
        elif gn == "e":  # its open right side reads as white the measure does not see
            adv -= 12
        elif ex == "g":  # the right side of g: the same room after the stem
            adv = mp.x("u", 420) + up_adv["g"] - mp.x("g", 477)
        f["hmtx"][gn] = (round(adv), 0)

    for gn, base in FLAT_ACCENTED.items():
        if base not in polys:
            continue
        rec = RecordingPen(); new[gn].draw(rec, glyf); pen = TTGlyphPen(None); draw_curves(polys[base], pen)
        cs = []
        for op, args in rec.value:
            if op == "moveTo": cs.append([])
            cs[-1].append((op, args))
        for c in cs:
            if min(p[1] for _, a in c for p in a) > m.xh + 15:
                for op, args in c: getattr(pen, op)(*args)
        new[gn] = pen.glyph(); f["hmtx"][gn] = (up_adv[gn] + f["hmtx"][base][0] - up_adv[base], 0)
    for gn, g in new.items():
        if g.isComposite() and g.components[0].glyphName in drawing:
            b = g.components[0].glyphName
            if up_adv[gn] == up_adv[b]:
                f["hmtx"][gn] = (f["hmtx"][b][0], 0)
        glyf[gn] = g
    # hmtx positions a glyph by its left side bearing, so a bearing left at the upright value
    # moves the sheared outline sideways and breaks the spacing.
    for gn in f.getGlyphOrder():
        g = glyf[gn]; g.recalcBounds(glyf)
        f["hmtx"][gn] = (f["hmtx"][gn][0], g.xMin if g.numberOfContours else 0)
    # the fi/fl/ff ligatures are upright drawings and would sit beside the drawn f
    for fr in f["GSUB"].table.FeatureList.FeatureRecord:
        if fr.FeatureTag in ("liga", "dlig"):
            fr.Feature.LookupListIndex = []; fr.Feature.LookupCount = 0
    f["post"].italicAngle = -ANGLE

    # how far the curves sit from the polygons they were fitted to
    dev = 0
    for gn, poly in polys.items():
        dev = max(dev, shape(f, gn).boundary.hausdorff_distance(poly.boundary))
    report["curve deviation max"] = round(dev, 2)
    report["points a/o/s"] = [len(glyf[g].coordinates) for g in "aos"]

    if correct:
        kern = Kern(f); up = Kern(m.font)
        _, _, _, d_up = gaps(m.font, up)
        kern.remap_y(); fixed = {}
        for _ in range(4):
            _, _, _, d_it = gaps(f, kern); moved = False
            for pair, d in d_it.items():
                if d < 24 and d < 0.7 * d_up[pair]:  # closer than the upright sets them, and close
                    add = max(12, math.ceil(min(32, d_up[pair]) - d)); kern.pairs[pair] = kern.value(*pair) + add
                    fixed[pair] = fixed.get(pair, 0) + add; moved = True
            if not moved:
                break
        cm = f.getBestCmap(); clear = {cm[ord(c)] for c in CLEAR if ord(c) in cm}
        for pair, d in d_it.items():
            if (pair[0] in clear) != (pair[1] in clear) and d < CLEAR_GAP:
                kern.pairs[pair] = kern.value(*pair) + math.ceil(CLEAR_GAP - d); fixed[pair] = fixed.get(pair, 0) + math.ceil(CLEAR_GAP - d)
        d_it = gaps(f, kern)[3]
        # tt: the exit of the first t sits under the bar of the second, so the pair reads loose;
        # it is brought to the upright's gap plus the 12 every exit letter is given
        tt = ("t", "t"); kern.pairs[tt] = kern.value(*tt) - max(0, round(d_it[tt] - d_up[tt] - 12))
        d_it[tt] = gaps(f, kern)[3][tt]
        kern.write(); report["kerned apart"] = fixed
        report["still close"] = {p: round(d, 1) for p, d in d_it.items() if d < 24 and d < 0.7 * d_up[p]}
        report["tt ff gap"] = {p: (round(d_up[(p, p)]), round(d_it[(p, p)])) for p in "tf"}
    name_italic(f, weight)
    f.flavor = "woff2"
    f.save(OUT / f"AltruvexSansLatin-Italic-{weight}.woff2")
    return report


def upright(w):
    """The built upright at one weight, as a static font."""
    # head.modified stays the upright's, so the same inputs give the same bytes
    f = instantiateVariableFont(TTFont(UPRIGHT, recalcTimestamp=False), {"wght": w})
    f.flavor = None
    return f


STYLE = {300: "Light", 400: "", 500: "Medium", 700: "Bold"}


def name_italic(f, weight):
    """Names, style bits and tables of an italic static: one family, Italic beside the upright."""
    style = (STYLE[weight] + " Italic").strip()
    ribbi = weight in (400, 700)
    fam = "Altruvex Sans Latin" + ("" if ribbi else " " + STYLE[weight])
    ps = "AltruvexSansLatin-" + style.replace(" ", "")
    name = f["name"]
    for nid in [n.nameID for n in name.names if n.nameID == 25 or n.nameID >= 256]:
        name.removeNames(nameID=nid)
    for nid, v in {1: fam, 2: "Bold Italic" if weight == 700 else "Italic", 3: f"0.1.0;ALTRUVEX;{ps}",
                   4: "Altruvex Sans Latin " + style, 6: ps, 16: "Altruvex Sans Latin", 17: style}.items():
        name.setName(v, nid, 3, 1, 0x409)
        name.removeNames(nameID=nid, platformID=1)
    for t in ("STAT", "fvar", "avar", "gvar", "HVAR", "MVAR"):
        if t in f:
            del f[t]
    os2 = f["OS/2"]
    os2.fsSelection = (os2.fsSelection & ~(1 << 6) & ~(1 << 5)) | 1 | ((1 << 5) if weight == 700 else 0)
    f["head"].macStyle = 2 | (1 if weight == 700 else 0)
    f["hhea"].caretSlopeRise, f["hhea"].caretSlopeRun = 1000, round(1000 * SH)


def jsonable(v):
    if isinstance(v, dict):
        return {("+".join(k) if isinstance(k, tuple) else k): jsonable(x) for k, x in v.items()}
    if isinstance(v, float):
        return round(v, 3)
    return list(v) if isinstance(v, tuple) else v


# Frozen (Ali, 2026-10-10): the Latin upright moved to Inter, but the italic stays the drawn italic
# exactly as it was built on Outfit (frozen/italic-outfit-2026-10-03/, the files committed before
# the rebase; tools/italic_fit.py scales them to the Inter x-height). The drawing above reads the built upright, so running it on Inter would change every
# glyph; the script refuses instead of overwriting the frozen files.
FROZEN_ON = "inter"


if __name__ == "__main__":
    if _config.load().families["latin"].source == FROZEN_ON:
        raise SystemExit("italic.py: the drawn italic is frozen (Ali, 2026-10-10) in "
                         "frozen/italic-outfit-2026-10-03/; tools/italic_fit.py scales it to the "
                         "Inter upright and writes dist/web.")
    m3 = Measures(300)
    report = {}
    for w in WEIGHTS:
        r = build(w, m3)
        report[w] = jsonable(r)
        print(w, {k: v for k, v in r.items() if k != "kerned apart"})
    REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
