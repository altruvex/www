"""Measurement helpers: HarfBuzz shaping + nonzero scanline raster on font units."""
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

_cache = {}
def font(path):
    if path not in _cache:
        data = open(path, "rb").read()
        tt = TTFont(path)
        if tt.flavor:  # hb wants the sfnt bytes
            import io; tt.flavor = None; b = io.BytesIO(); tt.save(b); data = b.getvalue()
            tt = TTFont(io.BytesIO(data))
        _cache[path] = (hb.Face(data), tt)
    return _cache[path]

def upem(path): return font(path)[1]["head"].unitsPerEm

def shape(path, text, w, features=None, direction=None):
    face, tt = font(path)
    f = hb.Font(face); f.set_variations({"wght": w})
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    if direction: buf.direction = direction
    hb.shape(f, buf, features or {})
    order = tt.getGlyphOrder()
    return [(order[i.codepoint], p.x_advance, p.x_offset, p.y_offset) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

from functools import lru_cache
_sc = {}
def _segs(tt, gname, w):
    k = (id(tt), gname, w)
    if k in _sc: return _sc[k]
    _sc[k] = r = _segs0(tt, gname, w); return r
def _segs0(tt, gname, w):
    gs = tt.getGlyphSet(location={"wght": w})
    pen = DecomposingRecordingPen(gs); gs[gname].draw(pen)
    segs = []; cur = start = None
    def flat_q(p0, pts):  # TrueType qCurveTo with implied on-curve points
        out = []; pts = list(pts)
        ctrl = pts[:-1]; end = pts[-1]
        ons = []
        for i in range(len(ctrl) - 1):
            ons.append(((ctrl[i][0] + ctrl[i + 1][0]) / 2, (ctrl[i][1] + ctrl[i + 1][1]) / 2))
        ons.append(end)
        a = p0
        for c, b in zip(ctrl, ons):
            for k in range(1, 9):
                t = k / 8
                out.append(((1-t)**2*a[0] + 2*(1-t)*t*c[0] + t*t*b[0], (1-t)**2*a[1] + 2*(1-t)*t*c[1] + t*t*b[1]))
            a = b
        if not ctrl: out.append(end)
        return out
    for op, args in pen.value:
        if op == "moveTo": cur = start = args[0]
        elif op == "lineTo": segs.append((cur, args[0])); cur = args[0]
        elif op == "qCurveTo":
            if args[-1] is None:  # closed contour of off-curves only
                args = args[:-1] + ((((args[-2][0]+args[0][0])/2), ((args[-2][1]+args[0][1])/2)),)
            pts = flat_q(cur, args)
            for p in pts: segs.append((cur, p)); cur = p
        elif op == "curveTo":
            (c1, c2, e) = args[-3:]; a = cur
            for k in range(1, 13):
                t = k / 12; mt = 1 - t
                p = (mt**3*a[0] + 3*mt*mt*t*c1[0] + 3*mt*t*t*c2[0] + t**3*e[0], mt**3*a[1] + 3*mt*mt*t*c1[1] + 3*mt*t*t*c2[1] + t**3*e[1])
                segs.append((cur, p)); cur = p
        elif op in ("closePath", "endPath"):
            if cur and start and cur != start: segs.append((cur, start))
            cur = start = None
    return segs

def spans(path, gname, w, y, dx=0):
    """Filled x-intervals of one glyph at height y (nonzero rule), shifted by dx."""
    tt = font(path)[1]
    xs = []
    for (x0, y0), (x1, y1) in _segs(tt, gname, w):
        if (y0 <= y < y1) or (y1 <= y < y0):
            x = x0 + (y - y0) * (x1 - x0) / (y1 - y0)
            xs.append((x, 1 if y1 > y0 else -1))
    xs.sort(); out = []; wind = 0; s = None
    for x, d in xs:
        prev = wind; wind += d
        if prev == 0 and wind != 0: s = x
        elif prev != 0 and wind == 0: out.append((s + dx, x + dx))
    return out

def ink_area(path, text, w, step=4, direction=None):
    """Ink area (units^2) of a shaped string, sampled every `step` units vertically; plus total advance."""
    tt = font(path)[1]
    g = shape(path, text, w, direction=direction)
    area = 0; x = 0
    ymin, ymax = -800, 1600
    for name, adv, xo, yo in g:
        for y in range(ymin, ymax, step):
            for a, b in spans(path, name, w, y - yo):
                area += (b - a) * step
        x += adv
    return area, x
