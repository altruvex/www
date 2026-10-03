"""Measured fallback faces for Altruvex Sans (step 18).

Usage: uv run python tools/fallback.py            # measure, write dist/web/fallback.css + report
       uv run python tools/fallback.py --browser  # also render brand vs fallback in Chromium + WebKit

Two families, "Altruvex Sans Latin Fallback" and "Altruvex Sans Arabic Fallback", point at local()
system fonts that exist on this Mac and are opened and measured here. Every number in the CSS comes
from a measurement recorded in dist/fallback-report.json:

- unicode-range: the built brand family's cmap, so a fallback face covers exactly the characters its
  brand face would have drawn.
- size-adjust: total shaped advance of the site's own copy (apps/www/messages/<locale>/*.json) in
  the brand face at weight W, divided by the same text in the fallback font. Shaped with HarfBuzz
  (default features, so kerning included), text split into runs that both fonts cover.
- ascent/descent/line-gap-override: the brand's vertical metrics as browsers use them (hhea, or
  OS/2 typo when USE_TYPO_METRICS is set; recorded), divided by size-adjust, because the override
  percentages apply to the size-adjusted font size.

One face per weight in config spacing.weights, each measured at that weight; the range boundaries
sit halfway between neighbours and the ends run to the brand axis limits. The local font for a
weight is the candidate style whose usWeightClass is nearest.

Per-string fit (decided 2026-09-30, replacing the corpus-average view): with the face's one
size-adjust, each string's fallback advance must land within +-PER_STRING_LIMIT_PCT of its brand
advance. Population: strings with 20+ characters both fonts cover (shorter ones are recorded in the
corpus totals only). The measurement lists how many strings exceed the limit and the worst of them.
It is recorded, not a gate: apps/www loads the brand faces with font-display: optional, so a
fallback face is never swapped out and its spread cannot move layout. One scalar cannot fix a
spread anyway (only the choice of fallback font or the fit method can), and the candidate with the
smallest spread is already the one chosen.

The browser step records deltas only.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
from dataclasses import dataclass
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont

from config import ROOT, load

WEB = ROOT / "dist" / "web"
CSS_PATH = WEB / "fallback.css"
REPORT_PATH = ROOT / "dist" / "fallback-report.json"
MESSAGES = ROOT.parent.parent / "apps" / "www" / "messages"
SUPPLEMENTAL = Path("/System/Library/Fonts/Supplemental")
SYSTEM = Path("/System/Library/Fonts")

FAMILY = {"latin": "Altruvex Sans Latin Fallback", "arabic": "Altruvex Sans Arabic Fallback"}
BRAND_FAMILY = {"latin": "Altruvex Sans Latin", "arabic": "Altruvex Sans Arabic"}
LOCALE = {"latin": "en", "arabic": "ar"}
HEADING_KEY = re.compile(r"^(title|heading|headline|subtitle)", re.I)
PER_STRING_LIMIT_PCT = 1.5

# Candidate system fonts: (file, index in a collection). Only fonts whose file opens here are
# measured; the choice between them is made by measurement in choose().
CANDIDATES: dict[str, dict[str, list[tuple[Path, int]]]] = {
    "latin": {
        "Arial": [(SUPPLEMENTAL / "Arial.ttf", 0), (SUPPLEMENTAL / "Arial Bold.ttf", 0)],
    },
    "arabic": {
        "Arial": [(SUPPLEMENTAL / "Arial.ttf", 0), (SUPPLEMENTAL / "Arial Bold.ttf", 0)],
        "Tahoma": [(SUPPLEMENTAL / "Tahoma.ttf", 0), (SUPPLEMENTAL / "Tahoma Bold.ttf", 0)],
        "Geeza Pro": [(SYSTEM / "GeezaPro.ttc", 0), (SYSTEM / "GeezaPro.ttc", 1)],
    },
}
# Named in common fallback stacks but with no file on this Mac, so they get no metrics.
NOT_MEASURED = {
    "Segoe UI": "Windows only; no file on this Mac, so no metrics are claimed",
    "Roboto": "Android/ChromeOS; no file on this Mac",
    "Noto Sans Arabic": "Android/Linux; no file on this Mac",
    "SF Pro / SF Arabic": "system-ui faces; hidden (.SF names), not reachable through local()",
}


# ---------------------------------------------------------------- fonts

def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@dataclass
class Font:
    path: Path
    index: int
    tt: TTFont
    hb_face: hb.Face
    cmap: dict[int, str]
    upm: int
    variable: bool

    @classmethod
    def open(cls, path: Path, index: int = 0) -> "Font":
        tt = TTFont(path, fontNumber=index, lazy=False)
        if tt.flavor:  # woff2 -> sfnt bytes for HarfBuzz
            tt.flavor = None
            buf = io.BytesIO()
            tt.save(buf)
            data = buf.getvalue()
            tt = TTFont(io.BytesIO(data))
            face = hb.Face(data)
        else:
            face = hb.Face(path.read_bytes(), index)
        return cls(path, index, tt, face, tt.getBestCmap(), tt["head"].unitsPerEm, "fvar" in tt)

    def hb_font(self, weight: int | None) -> hb.Font:
        f = hb.Font(self.hb_face)
        if self.variable and weight is not None:
            f.set_variations({"wght": weight})
        return f

    def names(self) -> list[str]:
        """local() names: full name (ID 4) then PostScript name (ID 6), as the file declares them."""
        n = self.tt["name"]
        out: list[str] = []
        for i in (4, 6):
            v = n.getDebugName(i)
            if v and v not in out:
                out.append(v)
        return out

    def describe(self) -> dict:
        n = self.tt["name"]
        return {"file": str(self.path), "index": self.index, "sha256": _sha(self.path),
                "family": n.getDebugName(1), "style": n.getDebugName(2), "version": n.getDebugName(5),
                "weight_class": self.tt["OS/2"].usWeightClass, "local": self.names()}


def vertical(font: TTFont) -> dict:
    """The vertical metrics browsers use: OS/2 typo when USE_TYPO_METRICS (fsSelection bit 7) is
    set, hhea otherwise. Both sets are recorded so the choice can be checked."""
    os2, hhea, upm = font["OS/2"], font["hhea"], font["head"].unitsPerEm
    use_typo = bool(os2.fsSelection & (1 << 7))
    typo = {"ascent": os2.sTypoAscender, "descent": -os2.sTypoDescender, "line_gap": os2.sTypoLineGap}
    hh = {"ascent": hhea.ascent, "descent": -hhea.descent, "line_gap": hhea.lineGap}
    used = typo if use_typo else hh
    return {"upm": upm, "use_typo_metrics": use_typo, "typo": typo, "hhea": hh,
            "win": {"ascent": os2.usWinAscent, "descent": os2.usWinDescent},
            "source": "typo" if use_typo else "hhea",
            "used_em": {k: round(v / upm, 6) for k, v in used.items()}}


# ---------------------------------------------------------------- corpus

def _strings(node, key: str = "") -> list[tuple[str, str]]:
    if isinstance(node, dict):
        return [s for k, v in node.items() for s in _strings(v, k)]
    if isinstance(node, list):
        return [s for v in node for s in _strings(v, key)]
    return [(key, node)] if isinstance(node, str) else []


def _clean(s: str) -> str:
    s = re.sub(r"<[^<>]*>", "", s)  # rich-text tags
    while (t := re.sub(r"\{[^{}]*\}", "", s)) != s:  # ICU arguments, innermost first
        s = t
    return re.sub(r"\s+", " ", s).strip()


def corpus(locale: str) -> list[tuple[str, str]]:
    """(key, text) for every string in apps/www/messages/<locale>/*.json, files sorted."""
    out = []
    for p in sorted((MESSAGES / locale).glob("*.json")):
        for key, s in _strings(json.loads(p.read_text())):
            if t := _clean(s):
                out.append((key, t))
    return out


def _runs(text: str, cover: set[int]) -> list[str]:
    out, cur = [], []
    for ch in text:
        if ord(ch) in cover:
            cur.append(ch)
        elif cur:
            out.append("".join(cur))
            cur = []
    if cur:
        out.append("".join(cur))
    return out


def advance_em(font: hb.Font, upm: int, text: str) -> float:
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {})
    return sum(p.x_advance for p in buf.glyph_positions) / upm


# ---------------------------------------------------------------- measurement

def measure(script: str, brand: Font, fb: Font, weight: int, texts: list[tuple[str, str]]) -> dict:
    cover = set(brand.cmap) & set(fb.cmap)
    skipped = sorted({ord(c) for _, t in texts for c in t if ord(c) in brand.cmap and ord(c) not in fb.cmap})
    bf, ff = brand.hb_font(weight), fb.hb_font(None)
    b_all = f_all = b_head = f_head = 0.0
    chars = heads = 0
    ratios, fits = [], []
    for key, t in texts:
        rs = _runs(t, cover)
        if not rs:
            continue
        b = sum(advance_em(bf, brand.upm, r) for r in rs)
        f = sum(advance_em(ff, fb.upm, r) for r in rs)
        n = sum(len(r) for r in rs)
        b_all, f_all, chars = b_all + b, f_all + f, chars + n
        if HEADING_KEY.match(key):
            b_head, f_head, heads = b_head + b, f_head + f, heads + 1
        if n >= 20 and f:
            ratios.append(b / f)
            fits.append((key, t, b, f))
    mean = sum(ratios) / len(ratios)
    sd = (sum((r - mean) ** 2 for r in ratios) / len(ratios)) ** 0.5
    sa = b_all / f_all
    # Per-string residual with the one scalar: (fallback advance x size-adjust - brand) / brand.
    devs = sorted(((round((f * sa / b - 1) * 100, 2), key, t) for key, t, b, f in fits), key=lambda d: (-abs(d[0]), d[1], d[2]))
    over = [d for d in devs if abs(d[0]) > PER_STRING_LIMIT_PCT]
    return {
        "weight": weight,
        "strings": len(texts), "chars": chars,
        "brand_advance_em": round(b_all, 3), "fallback_advance_em": round(f_all, 3),
        "size_adjust": sa,
        "headings_only": {"strings": heads, "size_adjust": round(b_head / f_head, 5) if f_head else None},
        # Per-string spread (strings of 20+ covered chars): how well one scalar fits the copy.
        "per_string": {"n": len(ratios), "sd": round(sd, 5), "cv": round(sd / mean, 5),
                       "min": round(min(ratios), 5), "max": round(max(ratios), 5)},
        "per_string_fit": {"limit_pct": PER_STRING_LIMIT_PCT, "n": len(devs), "over": len(over),
                           "over_share": round(len(over) / len(devs), 4) if devs else None,
                           "max_abs_pct": abs(devs[0][0]) if devs else None,
                           "worst": [{"d_pct": d, "key": k, "text": t[:60]} for d, k, t in over[:10]]},
        "not_in_fallback": [f"U+{c:04X}" for c in skipped],
    }


def _nearest_style(styles: list[Font], weight: int) -> Font:
    return min(styles, key=lambda f: (abs(f.tt["OS/2"].usWeightClass - weight), f.tt["OS/2"].usWeightClass))


def _pct(x: float) -> float:
    return round(x * 100, 2)


def ranges(weights: list[int], lo: int, hi: int) -> list[tuple[int, int]]:
    out = []
    for i, w in enumerate(weights):
        a = lo if i == 0 else (weights[i - 1] + w) // 2
        b = hi if i == len(weights) - 1 else (w + weights[i + 1]) // 2 - 1
        out.append((a, b))
    return out


def unicode_range(cps: set[int]) -> str:
    """Compact U+XXXX / U+XXXX-YYYY list of exactly the given codepoints."""
    spans: list[list[int]] = []
    for c in sorted(cps):
        if spans and c == spans[-1][1] + 1:
            spans[-1][1] = c
        else:
            spans.append([c, c])
    return ", ".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in spans)


def generate() -> tuple[str, dict]:
    cfg = load()
    weights = sorted(cfg.spacing.weights)
    rep: dict = {"method": __doc__.split("\n\n", 1)[1].strip(), "weights": weights, "families": {},
                 "not_measured": NOT_MEASURED, "candidates": {}}
    faces_css: list[str] = []
    for script in ("latin", "arabic"):
        brand = Font.open(WEB / cfg.families[script].output)
        axis = next(a for a in brand.tt["fvar"].axes if a.axisTag == "wght")
        v = vertical(brand.tt)
        texts = corpus(LOCALE[script])
        cands: dict[str, dict] = {}
        opened: dict[str, list[Font]] = {}
        for name, files in CANDIDATES[script].items():
            missing = [str(p) for p, _ in files if not p.exists()]
            if missing:
                cands[name] = {"measured": False, "reason": f"file not on this Mac: {missing}"}
                continue
            styles = [Font.open(p, i) for p, i in files]
            opened[name] = styles
            per = {str(w): measure(script, brand, _nearest_style(styles, w), w, texts) for w in weights}
            cv = max(m["per_string"]["cv"] for m in per.values())
            cands[name] = {"measured": True, "styles": [s.describe() for s in styles],
                           "size_adjust": {w: round(m["size_adjust"], 5) for w, m in per.items()},
                           "worst_per_string_cv": cv, "_per": per}
        # The candidate with the smallest per-string spread: one size-adjust fits the copy best.
        chosen = min((n for n in opened), key=lambda n: (cands[n]["worst_per_string_cv"], n))
        faces = []
        for (a, b), w in zip(ranges(weights, int(axis.minValue), int(axis.maxValue)), weights):
            fb = _nearest_style(opened[chosen], w)
            m = cands[chosen]["_per"][str(w)]
            sa = m["size_adjust"]
            face = {
                "font_weight": [a, b], "measured_at": w, "local": fb.names(),
                "source": fb.describe()["file"] + (f"#{fb.index}" if fb.path.suffix == ".ttc" else ""),
                "size_adjust_pct": _pct(sa),
                "ascent_override_pct": _pct(v["used_em"]["ascent"] / sa),
                "descent_override_pct": _pct(v["used_em"]["descent"] / sa),
                "line_gap_override_pct": _pct(v["used_em"]["line_gap"] / sa),
                "measurement": {k: m[k] for k in m if k != "size_adjust"} | {"size_adjust": round(sa, 6)},
            }
            faces.append(face)
            faces_css.append(_face_css(FAMILY[script], face, unicode_range(set(brand.cmap))))
        for c in cands.values():
            c.pop("_per", None)
        rep["families"][script] = {
            "family": FAMILY[script], "brand_family": BRAND_FAMILY[script],
            "brand_file": cfg.families[script].output, "brand_sha256": _sha(WEB / cfg.families[script].output),
            "brand_axis": [axis.minValue, axis.maxValue], "brand_vertical": v,
            "corpus": f"apps/www/messages/{LOCALE[script]}/*.json", "chosen": chosen,
            "unicode_range_codepoints": len(brand.cmap), "faces": faces,
        }
        rep["candidates"][script] = cands
    css = _header() + "\n".join(faces_css)
    rep["css"] = {"path": "dist/web/fallback.css", "sha256": hashlib.sha256(css.encode()).hexdigest()}
    return css, rep


def _header() -> str:
    return ("/* Altruvex Sans metric-matched fallback faces. Generated by tools/fallback.py from the\n"
            "   built fonts, the apps/www copy and the local system fonts it measured; the numbers\n"
            "   behind every value are in dist/fallback-report.json. Do not edit by hand.\n"
            "   Stack them after the brand family of the same script, e.g.\n"
            '   "Altruvex Sans Latin", "Altruvex Sans Arabic", "Altruvex Sans Latin Fallback",\n'
            '   "Altruvex Sans Arabic Fallback", sans-serif */\n')


def _face_css(family: str, f: dict, urange: str) -> str:
    src = ", ".join(f'local("{n}")' for n in f["local"])
    a, b = f["font_weight"]
    return (f"@font-face {{\n"
            f'  font-family: "{family}";\n'
            f"  src: {src};\n"
            f"  font-weight: {a} {b};\n"
            f"  size-adjust: {f['size_adjust_pct']}%;\n"
            f"  ascent-override: {f['ascent_override_pct']}%;\n"
            f"  descent-override: {f['descent_override_pct']}%;\n"
            f"  line-gap-override: {f['line_gap_override_pct']}%;\n"
            f"  unicode-range: {urange};\n"
            f"}}\n")


# ---------------------------------------------------------------- browser

PAGE = """<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="../dist/web/fallback.css">
<style>
 body { margin: 0; padding: 16px; }
 .t { white-space: nowrap; display: inline-block; font-size: 40px; line-height: normal; }
 .p { width: 600px; font-size: 20px; line-height: normal; }
 .brand-en { font-family: "Altruvex Sans Latin", "Altruvex Sans Arabic", sans-serif; }
 .fb-en { font-family: "Altruvex Sans Latin Fallback", "Altruvex Sans Arabic Fallback", sans-serif; }
 .raw-en { font-family: Arial, sans-serif; }
 .brand-ar { font-family: "Altruvex Sans Arabic", "Altruvex Sans Latin", sans-serif; }
 .fb-ar { font-family: "Altruvex Sans Arabic Fallback", "Altruvex Sans Latin Fallback", sans-serif; }
 .raw-ar { font-family: __RAW_AR__, sans-serif; }
</style></head><body><div id="root"></div></body></html>"""

MEASURE_JS = """([samples, para, weights, dir]) => {
  const root = document.getElementById('root');
  const lines = el => { const r = document.createRange(); r.selectNodeContents(el);
    const tops = new Set(); for (const q of r.getClientRects()) if (q.width > 0) tops.add(Math.round(q.top));
    return tops.size; };
  const out = {};
  for (const kind of ['brand', 'fb', 'raw']) {
    out[kind] = {};
    for (const w of weights) {
      const cls = kind + '-' + (dir === 'rtl' ? 'ar' : 'en');
      let width = 0, heights = [];
      for (const s of samples) {
        const el = document.createElement('span'); el.className = 't ' + cls; el.dir = dir;
        el.style.fontWeight = w; el.textContent = s; root.appendChild(el);
        const r = el.getBoundingClientRect(); width += r.width; heights.push(r.height); el.remove();
      }
      const p = document.createElement('div'); p.className = 'p ' + cls; p.dir = dir;
      p.style.fontWeight = w; p.textContent = para; root.appendChild(p);
      const ph = p.getBoundingClientRect().height, pl = lines(p); p.remove();
      out[kind][w] = { nowrap_width_px: +width.toFixed(2), line_box_px: +heights[0].toFixed(3),
                       para_height_px: +ph.toFixed(2), para_lines: pl };
    }
  }
  return out;
}"""

FACES_JS = """async (fams) => {
  const out = {};
  for (const [fam, w, text] of fams) {
    const got = await document.fonts.load(`${w} 40px "${fam}"`, text);
    out[`${fam} ${w}`] = got.map(f => f.status + ' ' + f.weight);
  }
  return out;
}"""


def samples(script: str) -> tuple[list[str], str]:
    """Deterministic corpus lines: the 12 longest heading strings (nowrap width) and a paragraph
    of the 8 longest non-heading strings (wrapped at 600px)."""
    texts = corpus(LOCALE[script])
    heads = sorted({t for k, t in texts if HEADING_KEY.match(k) and len(t) <= 90}, key=lambda t: (-len(t), t))[:12]
    body = sorted({t for k, t in texts if not HEADING_KEY.match(k)}, key=lambda t: (-len(t), t))[:8]
    return heads, " ".join(body)


def browser(rep: dict) -> dict:
    from browser import engines, serve

    weights = rep["weights"]
    raw_ar = '"' + rep["families"]["arabic"]["chosen"] + '"'
    html = PAGE.replace("__RAW_AR__", raw_ar)
    out: dict = {"css_sha256": rep["css"]["sha256"], "engines": {},
                 "method": ("nowrap: 12 longest heading strings at 40px, summed span width, line box = span "
                            "height at line-height normal. para: 8 longest body strings joined, 600px box, "
                            "20px, line-height normal; lines = distinct client-rect tops. brand = built "
                            "faces, fb = fallback.css, raw = the chosen local font with no overrides. "
                            "delta = (fb - brand) / brand.")}
    with serve() as base, engines(("chromium", "webkit")) as it:
        for name, br, err in it:
            if br is None:
                out["engines"][name] = {"not_run": err}
                continue
            page = br.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=2)
            url = base + "__fallback.html"
            page.route(url, lambda r: r.fulfill(body=html, content_type="text/html; charset=utf-8"))
            page.goto(url)
            page.evaluate("document.fonts.ready.then(() => true)")
            e: dict = {"version": br.version, "faces": page.evaluate(FACES_JS, [
                [FAMILY[s], w, "Aa" if s == "latin" else "اب"] for s in FAMILY for w in weights]
                + [[BRAND_FAMILY[s], w, "Aa" if s == "latin" else "اب"] for s in FAMILY for w in weights])}
            for script in ("latin", "arabic"):
                heads, para = samples(script)
                predicted = _hb_predicted(rep, script, heads)
                m = page.evaluate(MEASURE_JS, [heads, para, weights, "rtl" if script == "arabic" else "ltr"])
                res = {}
                for w in weights:
                    b, f, r = (m[k][str(w)] for k in ("brand", "fb", "raw"))
                    d = lambda x, k: round((x[k] - b[k]) / b[k] * 100, 2)  # noqa: E731
                    res[str(w)] = {"brand": b, "fallback": f, "raw": r,
                                   "width_delta_pct": d(f, "nowrap_width_px"),
                                   "line_box_delta_pct": d(f, "line_box_px"),
                                   "para_height_delta_pct": d(f, "para_height_px"),
                                   "para_lines_delta": f["para_lines"] - b["para_lines"],
                                   "raw_width_delta_pct": d(r, "nowrap_width_px"),
                                   "raw_line_box_delta_pct": d(r, "line_box_px"),
                                   "hb_predicted_width_delta_pct": predicted[w]}
                e[script] = res
            if name == "chromium":
                e["platform_fonts"] = _platform_fonts(page, html)
            out["engines"][name] = e
            page.close()
    return out


def _hb_predicted(rep: dict, script: str, heads: list[str]) -> dict[int, float]:
    """HarfBuzz's width delta for exactly the browser's nowrap samples, characters of this script's
    family only: shows whether a browser delta is the sample (vs the corpus) or the engine."""
    fam = rep["families"][script]
    brand = Font.open(WEB / fam["brand_file"])
    styles = [Font.open(p, i) for p, i in CANDIDATES[script][fam["chosen"]]]
    out = {}
    for face in fam["faces"]:
        w = face["measured_at"]
        m = measure(script, brand, _nearest_style(styles, w), w, [("title", t) for t in heads])
        out[w] = round((face["measurement"]["size_adjust"] / m["size_adjust"] - 1) * 100, 2)
    return out


def _platform_fonts(page, html: str) -> dict:
    """Chromium only: which platform font actually drew each fallback probe (CDP)."""
    page.evaluate("""() => { const root = document.getElementById('root'); root.innerHTML = '';
      for (const [id, cls, w, t] of [['pl4','fb-en',400,'Hamburgefonstiv'],['pl7','fb-en',700,'Hamburgefonstiv'],
                                     ['pa4','fb-ar',400,'نبني مواقع تملكها'],['pa7','fb-ar',700,'نبني مواقع تملكها']]) {
        const el = document.createElement('span'); el.id = id; el.className = 't ' + cls;
        el.style.fontWeight = w; el.textContent = t; root.appendChild(el); } }""")
    cdp = page.context.new_cdp_session(page)
    cdp.send("DOM.enable")
    cdp.send("CSS.enable")
    root = cdp.send("DOM.getDocument", {"depth": -1})["root"]["nodeId"]
    out = {}
    for key in ("pl4", "pl7", "pa4", "pa7"):
        node = cdp.send("DOM.querySelector", {"nodeId": root, "selector": f"#{key}"})["nodeId"]
        fonts = cdp.send("CSS.getPlatformFontsForNode", {"nodeId": node})["fonts"]
        out[key] = [{"family": f["familyName"], "postscript": f.get("postScriptName"),
                     "custom": f["isCustomFont"], "glyphs": f["glyphCount"]} for f in fonts]
    cdp.detach()
    return out


# ---------------------------------------------------------------- main

def write(css: str, rep: dict, run_browser: bool) -> dict:
    old = json.loads(REPORT_PATH.read_text()) if REPORT_PATH.exists() else {}
    if run_browser:
        CSS_PATH.write_text(css)  # the page loads the file from disk
        rep["browser"] = browser(rep)
    elif (b := old.get("browser")) and b.get("css_sha256") == rep["css"]["sha256"]:
        rep["browser"] = b  # still describes this exact CSS
    else:
        rep["browser"] = None
        rep["browser_reason"] = "not run for this CSS; run tools/fallback.py --browser"
    CSS_PATH.write_text(css)
    REPORT_PATH.write_text(json.dumps(rep, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    return rep


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--browser", action="store_true", help="render brand vs fallback in Chromium + WebKit")
    a = ap.parse_args()
    css, rep = generate()
    rep = write(css, rep, a.browser)
    for script, fam in rep["families"].items():
        print(f"{fam['family']} <- {fam['chosen']}")
        for f in fam["faces"]:
            print(f"  {f['font_weight'][0]}-{f['font_weight'][1]} @{f['measured_at']} {f['local'][0]}: "
                  f"size-adjust {f['size_adjust_pct']}% ascent {f['ascent_override_pct']}% "
                  f"descent {f['descent_override_pct']}% gap {f['line_gap_override_pct']}% "
                  f"(cv {f['measurement']['per_string']['cv']})")
    if rep.get("browser"):
        for eng, e in rep["browser"]["engines"].items():
            if "not_run" in e:
                print(f"{eng}: not run ({e['not_run']})")
                continue
            for script in ("latin", "arabic"):
                print(f"{eng} {script}: " + "; ".join(
                    f"{w} w{r['width_delta_pct']:+}% lb{r['line_box_delta_pct']:+}% lines{r['para_lines_delta']:+} "
                    f"(hb w{r['hb_predicted_width_delta_pct']:+}%, raw w{r['raw_width_delta_pct']:+}%)"
                    for w, r in e[script].items()))


if __name__ == "__main__":
    main()
