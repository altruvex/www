"""Font-loading test against the apps/www production build (spec step 30), with the runtime half
of the line-height lint (spec step 17b).

Usage: uv run python tools/font_loading.py [--base http://127.0.0.1:3020] [--runs 5]

Needs `bun run build` in apps/www and `next start` serving it at --base (default $WWW_BASE, else
http://127.0.0.1:3020). Nothing here starts or stops a server. Engines: Chromium, WebKit
(Playwright's WebKit build, not Safari) and Firefox when it launches; one that does not launch is
recorded as not run, never as passed.

The brand faces are `font-display: optional` with preload (decided 2026-09-30). Two paths are
measured per engine x route (/ and /ar) x width (desktop 1440x900, mobile 390x844), `--runs` loads
each, and kept apart in the report. Each run records, per heading, button-like control, form control
and nav link: computed font-family, layout width/height (offsetWidth/offsetHeight, which ignore
transforms), the widest text line (Range rects) and the line count (Range rects grouped by line),
at first paint (two rAF after DOMContentLoaded), at every later `loadingdone`, and after
document.fonts.ready. The spec rule is a hard fail on both paths: "If a heading changes line count
during font swap, the test fails".

1. as_served: the page as the build serves it, normal network. PASS = CLS <= 0.01 (layout shifts
   after first paint; engines without the Layout Instability API record CLS as null) and zero
   heading line-count changes after first paint.
2. font_late: every AltruvexSans*.woff2 request is held until first paint + SETTLE_MS, then
   released. Under `optional` the brand face must NOT be applied after first paint: PASS = zero
   heading line-count changes and the fallback face stays. "Stays" is evidence, not assumption:
   Chromium's CDP CSS.getPlatformFontsForNode must not name the brand font on any heading, and
   either every brand face ends in `error` (the engine gave up on it) or every brand face is
   `loaded` and no brand-set text width moved across the release (the `held` record, taken just
   before release, vs final; +-0.5 px). Measured 2026-09-30: Chromium loads the face and
   does not apply it; WebKit puts the face in its failure state and delays first paint to about
   1 s while the preload is held, and brand-set headings still move up to ~25 px after the
   first_paint record (block-period re-layout of text laid out but not yet painted, with the brand
   faces already `error`); line counts do not change (that ~1.2 s delay is not `optional`: see item 4). Chromium mobile shows a streaming layout
   settle in the first ~20 ms after a heading appears (#work-heading 251 -> 202 px, both with and
   without held fonts). Movement before the release is recorded per probe (d_text_width), not judged.
3. Diagnostics, recorded, not pass/fail: per brand-set single-line string, glyph width delta
   fallback (font_late) vs brand (as_served) against 1.5 %; per button, width delta against 33 px;
   the worst offenders are listed.
   EN pages are also loaded with the Arabic brand preload removed from the HTML in flight (the
   <link rel=preload> and the matching React :HL hint in the RSC payload; layout.tsx is not
   touched), and Chromium mobile EN runs under CDP slow-4G (150 ms RTT, 1638.4 kbit/s down).
3. line-height: normal (step 17b): after fonts are ready, every visible element with a direct
   non-blank text node whose computed line-height is `normal` is a finding (SVG text excluded:
   it has no line box).

Context options: reduced motion (entrance animations would move the boxes being measured),
service workers blocked (fresh fetches every time), device scale factor 1. The document itself is
served through route.fetch() without the CSP `upgrade-insecure-requests` directive: the test server
is plain http, and WebKit would otherwise upgrade every stylesheet and font to https and render the
page unstyled (Chromium exempts loopback). Nothing else in the response changes. The CSP also
forbids unsafe-eval, so Playwright's wait_for_function cannot run; waits poll page.evaluate (_poll).

Measured side effect (Chromium, 2026-09-30): without the HTML preload the Arabic file is still
fetched on EN about 0.7 s after load, because Next's link prefetch pulls RSC payloads for other
routes and React applies their :HL font hints. font_bytes_before_load vs font_bytes_total shows it.

4. webkit_block_period (diagnostic, WebKit only, not pass/fail): WebKit paints late while the
   brand woff2 is held. Is that `optional`? The same font_late hold runs on `/` (desktop) with the
   built CSS's brand @font-face `font-display` rewritten in flight (page.route on the stylesheet;
   apps/www is not touched) to swap / optional / fallback, plus an unheld run of the build as served;
   first contentful paint and LCP medians per value. A 5 s hold then shows whether the delay is
   capped (paints before the release) or unbounded (paints at the release).

Writes dist/font-loading-report.json; tools/build.py reads it into tests.font_loading.
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
import time
import unicodedata

from browser import ENGINES, engines
from config import ROOT
from matrix import _cmaps
from payload import base_url, build_id, reachable

REPORT = ROOT / "dist" / "font-loading-report.json"
ROUTES = {"en": "/", "ar": "/ar"}
WIDTHS = {"desktop": (1440, 900), "mobile": (390, 844)}
FONT_RE = re.compile(r"\.(woff2?|ttf|otf)(\?|$)")
ARABIC_FILE = "AltruvexSansArabic_VF"
SETTLE_MS = 1500
CLS_MAX = 0.01          # path (a), decided 2026-09-30
WIDTH_EPS = 0.5         # px: a brand-set probe whose text width moves more than this was re-drawn
DIAG_GLYPH_PCT = 1.5    # diagnostic only: fallback vs brand text width per single-line string
DIAG_BUTTON_PX = 33     # diagnostic only: fallback vs brand button width
FIRST_RUN_KEYS = ("probes", "line_height_normal", "brand_chars_outside_first_family", "snapshots", "brand_drawn",
                  "platform_fonts_headings", "cls_after_first_paint", "lcp_element", "heading_line_changes",
                  "brand_held", "brand_status_held", "brand_set_probes", "brand_status_final", "brand_dropped")
BRAND_STATUS_JS = ("[...document.fonts].filter(f => f.family.startsWith('brand') && !f.family.includes('Fallback')"
                   " && f.status !== 'unloaded').map(f => f.family + ':' + f.status).sort()")
SLOW_4G = {"offline": False, "latency": 150, "downloadThroughput": 1638.4 * 1024 / 8,
           "uploadThroughput": 675 * 1024 / 8}

# Runs before any page script: LCP and CLS observers, and the snapshot function.
INIT_JS = r"""
(() => {
  const fl = (window.__fl = { lcp: [], shifts: [], snaps: [], supported: [], releasedAt: null });
  try { fl.supported = [...PerformanceObserver.supportedEntryTypes]; } catch {}
  const observe = (type, fn) => {
    if (!fl.supported.includes(type)) return;
    new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true });
  };
  observe("largest-contentful-paint", (e) => fl.lcp.push({
    t: e.startTime, size: e.size, tag: e.element ? e.element.tagName.toLowerCase() : null,
    text: e.element ? (e.element.textContent || "").trim().slice(0, 60) : null }));
  observe("layout-shift", (e) => { if (!e.hadRecentInput) fl.shifts.push({ t: e.startTime, v: e.value }); });

  const KINDS = [
    ["heading", "h1,h2,h3,h4,h5,h6,.section-title"],
    ["button", "button,[role=button],input[type=submit],input[type=button],a"],
    ["control", "input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea,label"],
    ["nav", "nav a"],
  ];
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const buttonLike = (el, cs) => el.tagName !== "A" ||
    (/inline-flex|inline-block|^flex$/.test(cs.display) && parseFloat(cs.paddingLeft) >= 8);

  function selector(el) {
    const parts = [];
    for (let n = el, i = 0; n && n.nodeType === 1 && n !== document.body && i < 4; n = n.parentElement, i++) {
      let s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(`${s}#${CSS.escape(n.id)}`); break; }
      const cls = [...n.classList].slice(0, 2).map((c) => "." + CSS.escape(c)).join("");
      const sib = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [];
      parts.unshift(s + cls + (sib.length > 1 ? `:nth-of-type(${sib.indexOf(n) + 1})` : ""));
    }
    return parts.join(" > ");
  }

  function lines(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5)
      .sort((a, b) => (a.top + a.bottom) - (b.top + b.bottom));
    const rows = [];
    for (const x of rects) {
      const c = (x.top + x.bottom) / 2, row = rows[rows.length - 1];
      if (row && c >= row.top && c <= row.bottom) {
        row.left = Math.min(row.left, x.left); row.right = Math.max(row.right, x.right);
        row.top = Math.min(row.top, x.top); row.bottom = Math.max(row.bottom, x.bottom);
      } else rows.push({ top: x.top, bottom: x.bottom, left: x.left, right: x.right });
    }
    return { lines: rows.length, text_width: rows.length ? Math.max(...rows.map((w) => w.right - w.left)) : 0 };
  }

  fl.snap = (label) => {
    const t = performance.now();
    if (!fl.probes) {
      fl.probes = [];
      const seen = new Set();
      for (const [kind, sel] of KINDS) {
        for (const el of document.querySelectorAll(sel)) {
          if (seen.has(el) || !(el instanceof HTMLElement) || !visible(el)) continue;
          if (!(el.textContent || "").trim() && kind !== "control") continue;
          if (kind === "button" && !buttonLike(el, getComputedStyle(el))) continue;
          seen.add(el);
          el.setAttribute("data-fl-probe", String(fl.probes.length));  // CDP finds it by this (Chromium)
          fl.probes.push({ el, kind, selector: selector(el), text: (el.textContent || el.value || "").trim().replace(/\s+/g, " ").slice(0, 80) });
        }
      }
    }
    const items = fl.probes.map((p, i) => {
      if (!p.el.isConnected) return null;
      const cs = getComputedStyle(p.el);
      const l = lines(p.el);
      return { i, family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, line_height: cs.lineHeight,
               width: p.el.offsetWidth, height: p.el.offsetHeight,
               text_width: Math.round(l.text_width * 100) / 100, lines: l.lines };
    });
    const faces = [...document.fonts].map((f) => `${f.family.replace(/["']/g, "")}:${f.status}`);
    fl.snaps.push({ label, t, items, faces: [...new Set(faces)].sort() });
  };

  // First record: two frames after DOMContentLoaded, i.e. after the first frame the page rendered
  // (a render-blocking optional preload holds that frame, and rAF with it). Every later
  // `loadingdone` is recorded too, so a face applied after first paint cannot slip between records.
  document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(() => requestAnimationFrame(() => {
    fl.firstPaintAt = performance.now();
    fl.snap("first_paint");
    document.fonts.addEventListener("loadingdone", (e) => fl.snap(
      "loadingdone:" + [...new Set(e.fontfaces.map((f) => f.family.replace(/["']/g, "")))].sort().join("+")));
  })));

  fl.release = () => { fl.snap("held"); fl.releasedAt = performance.now(); };

  fl.probeMeta = () => fl.probes.map((p) => ({ kind: p.kind, selector: p.selector, text: p.text }));

  fl.lineHeightNormal = () => {
    const out = [];
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE", "OPTION"]);
    for (const el of document.body.querySelectorAll("*")) {
      if (skip.has(el.tagName) || el instanceof SVGElement || !visible(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.data.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.lineHeight !== "normal") continue;
      out.push({ selector: selector(el), tag: el.tagName.toLowerCase(), family: cs.fontFamily,
                 size: cs.fontSize, text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 60) });
    }
    return out;
  };

  // Text set in the brand stack, by its first family: a character the first family lacks makes the
  // browser fetch the second (on EN, the Arabic file) even without a preload.
  fl.brandText = () => {
    const out = [];
    // Laid out (has boxes) is enough: a visibility:hidden menu still makes the browser fetch its font.
    for (const el of document.body.querySelectorAll("*")) {
      if (el instanceof SVGElement || el.getClientRects().length === 0) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.data).join("");
      if (!own.trim()) continue;
      const first = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/["']/g, "");
      if (first.startsWith("brand")) out.push({ first, selector: selector(el), text: own });
    }
    return out;
  };

  fl.metrics = () => {
    const lcp = fl.lcp[fl.lcp.length - 1] || null;
    const sum = (a) => Math.round(a.reduce((s, x) => s + x.v, 0) * 10000) / 10000;
    const after = fl.releasedAt == null ? [] : fl.shifts.filter((s) => s.t >= fl.releasedAt);
    const before = fl.releasedAt == null ? fl.shifts : fl.shifts.filter((s) => s.t < fl.releasedAt);
    return {
      lcp_ms: lcp ? Math.round(lcp.t) : null, lcp_element: lcp ? { tag: lcp.tag, text: lcp.text } : null,
      lcp_supported: fl.supported.includes("largest-contentful-paint"),
      cls: fl.supported.includes("layout-shift") ? sum(fl.shifts) : null,
      cls_before_release: fl.supported.includes("layout-shift") ? sum(before) : null,
      cls_after_release: fl.supported.includes("layout-shift") ? sum(after) : null,
      cls_after_first_paint: fl.supported.includes("layout-shift") && fl.firstPaintAt != null
        ? sum(fl.shifts.filter((s) => s.t >= fl.firstPaintAt)) : null,
      cls_supported: fl.supported.includes("layout-shift"),
    };
  };
})();
"""


def _context(browser, size):
    ctx = browser.new_context(viewport={"width": size[0], "height": size[1]}, device_scale_factor=1,
                              reduced_motion="reduce", service_workers="block")
    ctx.add_init_script(INIT_JS)
    return ctx


def outside_first_family(items: list[dict]) -> list[dict]:
    """Non-space characters in brand-set text that the stack's first brand family has no glyph for."""
    cmaps = _cmaps()
    first = {"brandLatin": "latin", "brandArabic": "arabic"}
    found: dict[str, dict] = {}
    for it in items:
        cmap = cmaps.get(first.get(it["first"], ""), set())
        for ch in it["text"]:
            if ch.isspace() or ord(ch) in cmap:
                continue
            f = found.setdefault(f"U+{ord(ch):04X}", {"char": ch, "name": unicodedata.name(ch, ""),
                                                        "first_family": it["first"], "examples": []})
            if len(f["examples"]) < 3 and it["selector"] not in f["examples"]:
                f["examples"].append(it["selector"])
    return [{"cp": k, **v} for k, v in sorted(found.items())]


def _strip_arabic_preload(html: str) -> tuple[str, int]:
    n = 0
    html, k = re.subn(r'<link rel="preload" href="[^"]*' + ARABIC_FILE + r'[^"]*"[^>]*/>', "", html)
    n += k
    # The RSC payload repeats the preload as a React hint (:HL[...]), which the client would act on
    # after hydration; the row is removed whole, escaped as it sits inside the inline script.
    html, k = re.subn(r':HL\[\\"[^\]]*' + ARABIC_FILE + r'[^\]]*\]\\n', "", html)
    return html, n + k


def _serve_doc(page, url: str, strip: bool, state: dict) -> None:
    """Serve the document through route.fetch(), minus CSP upgrade-insecure-requests (the test
    server is plain http on 127.0.0.1: WebKit upgrades every subresource to https and renders the
    page unstyled, Chromium exempts loopback), and minus the Arabic preload when `strip`."""
    def handler(route) -> None:
        resp = route.fetch()
        body = resp.text()
        if strip:
            body, state["removed"] = _strip_arabic_preload(body)
        headers = {k: v for k, v in resp.headers.items() if k.lower() not in ("content-length", "content-encoding")}
        for k in list(headers):
            if k.lower() == "content-security-policy":
                headers[k] = re.sub(r";?\s*upgrade-insecure-requests", "", headers[k])
        route.fulfill(status=resp.status, headers=headers, body=body)

    page.route(url, handler)


def _compare(meta: list[dict], snaps: list[dict]) -> list[dict]:
    """Per probe: first-paint vs final deltas, and every line count seen from first paint to final."""
    first, final = snaps[0], snaps[-1]
    rows = []
    for m, b, f in zip(meta, first["items"], final["items"]):
        if b is None or f is None:
            continue
        seen = [s["items"][b["i"]]["lines"] for s in snaps if s["items"][b["i"]] is not None]
        rows.append({**m, "i": b["i"], "family": f["family"], "size": f["size"], "weight": f["weight"],
                     "first": {k: b[k] for k in ("width", "height", "text_width", "lines")},
                     "final": {k: f[k] for k in ("width", "height", "text_width", "lines")},
                     "d_width": f["width"] - b["width"], "d_height": f["height"] - b["height"],
                     "d_text_width": round(f["text_width"] - b["text_width"], 2),
                     "lines_seen": sorted(set(seen)), "line_change": len(set(seen)) > 1})
    return rows


def brand_set(row: dict) -> bool:
    """Set in the brand stack: the computed font-family starts with a next/font brand family."""
    return row["family"].split(",")[0].strip().strip("\"'").startswith("brand")


def heading_line_changes(rows: list[dict]) -> list[dict]:
    return [{"text": r["text"], "selector": r["selector"], "lines_seen": r["lines_seen"]}
            for r in rows if r["kind"] == "heading" and r["line_change"]]


def _platform_fonts(page, rows: list[dict]) -> dict[str, list[str]] | None:
    """Chromium only (CDP): the fonts that actually drew each brand-set heading, by probe index."""
    try:
        cdp = page.context.new_cdp_session(page)
    except Exception:  # noqa: BLE001 — WebKit/Firefox have no CDP; the width evidence stands alone
        return None
    cdp.send("DOM.enable")
    cdp.send("CSS.enable")
    root = cdp.send("DOM.getDocument", {"depth": 0})["root"]["nodeId"]
    out = {}
    for r in rows:
        if r["kind"] != "heading" or not brand_set(r):
            continue
        node = cdp.send("DOM.querySelector", {"nodeId": root, "selector": f'[data-fl-probe="{r["i"]}"]'})["nodeId"]
        if node:
            fonts = cdp.send("CSS.getPlatformFontsForNode", {"nodeId": node})["fonts"]
            out[str(r["i"])] = sorted({f["familyName"] for f in fonts})
    cdp.detach()
    return out


def _brand_drawn(platform: dict[str, list[str]] | None) -> bool | None:
    return None if platform is None else any(f.startswith("Altruvex Sans") for fs in platform.values() for f in fs)


def _poll(page, expr: str, seconds: float) -> bool:
    """page.wait_for_function compiles its predicate with eval, which the site's CSP refuses;
    page.evaluate does not, so poll with it."""
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if page.evaluate(expr):
            return True
        page.wait_for_timeout(50)
    return False


def page_run(browser, base: str, path: str, size, mode: str, strip: bool = False, throttle: bool = False,
             keep: bool = False) -> dict:
    """One fresh page view.

    as_served: the page as the server sends it (optionally without the Arabic preload, optionally
    throttled); records from first paint to after load + document.fonts.ready.
    font_late: the brand woff2 requests are held, not failed, until SETTLE_MS after first paint,
    then released; the last record is taken once both brand faces report `loaded`."""
    ctx = _context(browser, size)
    page = ctx.new_page()
    fonts: list = []
    held: list = []
    state = {"loaded": False, "removed": None, "hold": mode == "font_late"}

    def on_brand(route) -> None:
        (held.append(route) if state["hold"] else route.continue_())

    _serve_doc(page, base + path, strip, state)
    if mode == "font_late":
        page.route(re.compile(r"AltruvexSans[^/]*\.woff2"), on_brand)
    page.on("requestfinished", lambda r: r.resource_type == "font" and fonts.append((r, not state["loaded"])))
    page.on("load", lambda: state.__setitem__("loaded", True))
    if throttle:
        cdp = ctx.new_cdp_session(page)
        cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", SLOW_4G)
    out: dict = {}
    if mode == "font_late":
        page.goto(base + path, wait_until="domcontentloaded")
        _poll(page, "window.__fl.firstPaintAt != null", 30)
        page.wait_for_timeout(SETTLE_MS)
        out["brand_held"] = len(held)
        out["brand_status_held"] = page.evaluate(BRAND_STATUS_JS)
        page.evaluate("window.__fl.release()")
        state["hold"] = False
        for r in held:
            r.continue_()
        # Wait until each requested brand face has settled: `loaded` (Chromium: the file arrived,
        # and under optional must still not be applied) or `error` (WebKit: an optional face that
        # missed its block period goes to the failure state and is never used by this page).
        _poll(page, "[...document.fonts].filter(f => f.family.startsWith('brand') && !f.family.includes('Fallback')"
                    " && f.status !== 'unloaded').every(f => f.status === 'loaded' || f.status === 'error')", 15)
        out["brand_status_final"] = page.evaluate(BRAND_STATUS_JS)
        page.wait_for_load_state("load", timeout=120_000)
    else:
        page.goto(base + path, wait_until="load", timeout=120_000)
        page.wait_for_load_state("networkidle", timeout=120_000)
    page.evaluate("document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))")
    page.wait_for_timeout(500)
    page.evaluate("window.__fl.snap('final')")
    fl = page.evaluate("({ snaps: window.__fl.snaps.map(s => ({...s})), meta: window.__fl.probeMeta(), "
                       "metrics: window.__fl.metrics(), lh: window.__fl.lineHeightNormal(), brand: window.__fl.brandText() })")
    rows = _compare(fl["meta"], fl["snaps"])
    platform = _platform_fonts(page, rows)
    bytes_rows = []
    for r, before in fonts:
        resp = r.response()
        bytes_rows.append({"file": r.url.rsplit("/", 1)[-1], "bytes": len(resp.body()) if resp else 0, "before_load": before})
    ctx.close()
    if strip and not state["removed"]:
        raise RuntimeError("Arabic preload not found in the HTML: nothing was removed")
    m = fl["metrics"]
    changes = heading_line_changes(rows)
    out.update({
        "lcp_ms": m["lcp_ms"], "lcp_element": m["lcp_element"], "cls": m["cls"],
        "cls_after_first_paint": m["cls_after_first_paint"], "cls_after_release": m["cls_after_release"],
        "font_bytes_before_load": sum(x["bytes"] for x in bytes_rows if x["before_load"]),
        "font_bytes_total": sum(x["bytes"] for x in bytes_rows),
        "arabic_brand_fetched": any(ARABIC_FILE in x["file"] for x in bytes_rows),
        "removed_from_html": state["removed"],
        "snapshots": [{"label": s["label"], "t_ms": round(s["t"]), "faces": s["faces"]} for s in fl["snaps"]],
        "heading_line_changes": changes,
        "platform_fonts_headings": platform, "brand_drawn": _brand_drawn(platform),
    })
    if mode == "as_served":
        # Path (a): zero heading line changes after first paint, CLS <= CLS_MAX (where measurable).
        out["pass"] = not changes and (m["cls"] is None or m["cls"] <= CLS_MAX)
    else:
        # Path (b): the brand face is not applied after first paint (fallback stays), plus zero
        # heading line changes, the spec's hard rule. Evidence for "not applied", per face state:
        # - every requested brand face ended `error`: the engine dropped it for this page (WebKit);
        # - otherwise (a face `loaded`, i.e. it arrived): no brand-set probe's text width moved
        #   from first paint (+-WIDTH_EPS px) and, where CDP exists, no heading was drawn by an
        #   Altruvex Sans platform font (Chromium).
        # brand_set_moved is recorded either way. Movement between first paint and the release
        # (WebKit's block-period re-layout, streaming settle) stays visible in each probe's
        # d_text_width; only line-count changes over that span fail.
        # Moved is measured across the release (last record while held -> final), so a layout
        # settle during streaming right after first paint (seen: Chromium mobile, #work-heading
        # 251 -> 202 px within ~20 ms, fonts still loading) is not read as the brand face.
        held_snap = next(s for s in fl["snaps"] if s["label"] == "held")
        moved = []
        for r in rows:
            h = held_snap["items"][r["i"]]
            if brand_set(r) and h is not None and abs(r["final"]["text_width"] - h["text_width"]) > WIDTH_EPS:
                moved.append({"kind": r["kind"], "text": r["text"][:60],
                              "d_text_width": round(r["final"]["text_width"] - h["text_width"], 2)})
        final = [x.rsplit(":", 1)[1] for x in out["brand_status_final"]]
        out["brand_set_probes"] = sum(1 for r in rows if brand_set(r))
        out["brand_set_moved"] = moved
        out["brand_dropped"] = bool(final) and all(x == "error" for x in final)
        out["fallback_stays"] = (out["brand_held"] > 0 and out["brand_drawn"] is not True
                                 and (out["brand_dropped"] or (all(x == "loaded" for x in final) and not moved)))
        out["pass"] = not changes and out["fallback_stays"]
    if keep:  # the first run keeps the full records for diagnostics and the line-height check
        out["probes"] = rows
        out["line_height_normal"] = fl["lh"]
        out["brand_chars_outside_first_family"] = outside_first_family(fl["brand"])
    return out


BLOCK_DISPLAYS = ("swap", "optional", "fallback")
BLOCK_HOLDS_MS = (SETTLE_MS, 5000)
BLOCK_CAP_MARGIN_MS = 200   # a paint within this of the release is "at release", not capped
BLOCK_INIT_JS = r"""
(() => {
  const b = (window.__bp = { fp: null, fcp: null, lcp: null });
  const observe = (type, fn) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch {} };
  observe("paint", (e) => { if (e.name === "first-paint") b.fp = e.startTime; if (e.name === "first-contentful-paint") b.fcp = e.startTime; });
  observe("largest-contentful-paint", (e) => { b.lcp = e.startTime; });
})();
"""
BRAND_FACE_RE = re.compile(r"(@font-face\{font-family:brand(?:Latin|Arabic);[^}]*?font-display:)optional")


def _rewrite_display(page, display: str, state: dict) -> None:
    """Rewrite `font-display:optional` on the brand @font-face rules in the built stylesheets."""
    def handler(route) -> None:
        resp = route.fetch()
        body, n = BRAND_FACE_RE.subn(r"\g<1>" + display, resp.text())
        state["rewritten"] += n
        headers = {k: v for k, v in resp.headers.items() if k.lower() not in ("content-length", "content-encoding")}
        route.fulfill(status=resp.status, headers=headers, body=body)

    page.route(re.compile(r"/_next/static/.*\.css"), handler)


OTHER_FONT_RE = re.compile(r"/_next/static/media/(?!AltruvexSans)[^/]*\.woff2")


def block_run(browser, base: str, display: str | None, hold_ms: int, path: str = "/", other_font: bool = False) -> dict:
    """One fresh desktop view of `path`. `display` None serves the CSS as built (optional). The
    brand woff2 requests (`other_font`: the site's non-brand woff2 files instead, a control) are
    held for `hold_ms` after navigation commits, then released."""
    ctx = browser.new_context(viewport={"width": WIDTHS["desktop"][0], "height": WIDTHS["desktop"][1]},
                              device_scale_factor=1, reduced_motion="reduce", service_workers="block")
    ctx.add_init_script(BLOCK_INIT_JS)
    page = ctx.new_page()
    held: list = []
    state = {"hold": hold_ms > 0, "rewritten": 0}
    _serve_doc(page, base + path, False, {})
    if display:
        _rewrite_display(page, display, state)
    if hold_ms:
        page.route(OTHER_FONT_RE if other_font else re.compile(r"AltruvexSans[^/]*\.woff2"),
                   lambda r: held.append(r) if state["hold"] else r.continue_())
    start = time.monotonic()
    page.goto(base + path, wait_until="commit")
    while (time.monotonic() - start) * 1000 < hold_ms:
        page.wait_for_timeout(25)
    released = page.evaluate("performance.now()") if hold_ms else None
    state["hold"] = False
    for r in held:
        r.continue_()
    page.wait_for_load_state("load", timeout=120_000)
    page.evaluate("document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))")
    page.wait_for_timeout(500)
    m = page.evaluate("window.__bp")
    shown = page.evaluate(
        "[...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })"
        ".filter(r => r.type === 5 && r.style.fontFamily.startsWith('brand'))"
        ".map(r => r.style.fontFamily + ':' + (r.style.getPropertyValue('font-display') || 'auto'))")
    ctx.close()
    return {"fcp_ms": None if m["fcp"] is None else round(m["fcp"]), "lcp_ms": None if m["lcp"] is None else round(m["lcp"]),
            "released_at_ms": None if released is None else round(released), "held": len(held),
            "rewritten": state["rewritten"], "face_display": sorted(set(shown))}


def _block_row(rs: list[dict]) -> dict:
    fcp, lcp = _median(rs, "fcp_ms"), _median(rs, "lcp_ms")
    rel = _median(rs, "released_at_ms")
    row = {"median_fcp_ms": fcp, "median_lcp_ms": lcp, "fcp_ms": [r["fcp_ms"] for r in rs],
           "lcp_ms": [r["lcp_ms"] for r in rs], "face_display_seen": sorted({x for r in rs for x in r["face_display"]}),
           "brand_requests_held": sorted({r["held"] for r in rs}), "rewritten": sorted({r["rewritten"] for r in rs})}
    if rel is not None:
        row["median_released_at_ms"] = rel
        row["painted_before_release_runs"] = sum(1 for r in rs if r["fcp_ms"] is not None
                                                 and r["fcp_ms"] < r["released_at_ms"] - BLOCK_CAP_MARGIN_MS)
    return row


def block_finding(bp: dict) -> dict:
    """Read the recorded rows: is the delay caused by `optional`, and is it capped? Recomputed by the
    test from the rows alone."""
    hold = bp["hold_ms"][str(SETTLE_MS)]
    fcp = {d: hold[d]["median_fcp_ms"] for d in BLOCK_DISPLAYS}
    long_ = bp["hold_ms"][str(BLOCK_HOLDS_MS[-1])]
    ctl = bp["control_other_font_held"]
    out = {"fcp_by_display_ms": fcp,
           "other_font_held_fcp_ms": ctl["median_fcp_ms"],
           "other_font_held_paints_before_release": ctl["painted_before_release_runs"] > 0,
           "no_hold_fcp_ms": bp["as_built_no_hold"]["median_fcp_ms"],
           "delay_follows_display": fcp["optional"] is not None and fcp["swap"] is not None
           and fcp["optional"] - fcp["swap"] > BLOCK_CAP_MARGIN_MS}
    for d in BLOCK_DISPLAYS:
        row = long_[d]
        rel = row["median_released_at_ms"]
        out[f"{d}_5s_hold"] = ("paints at the release" if row["painted_before_release_runs"] == 0
                               else f"paints before the release, median FCP {row['median_fcp_ms']} ms of {rel} ms")
    return out


def webkit_block_period(browser, base: str, runs: int) -> dict:
    """See docstring item 4. Variants are alternated per run so drift hits them alike."""
    v = {"as_built_no_hold": (None, 0)}
    for h in BLOCK_HOLDS_MS:
        for d in BLOCK_DISPLAYS:
            v[f"{d}@{h}"] = (d, h)
    control = f"other_font@{BLOCK_HOLDS_MS[-1]}"
    v[control] = (None, BLOCK_HOLDS_MS[-1])
    raw: dict[str, list] = {k: [] for k in v}
    for _ in range(runs):
        for k, (d, h) in v.items():
            raw[k].append(block_run(browser, base, d, h, other_font=k == control))
    bp = {"engine": "webkit", "version": browser.version, "route": "/", "viewport": "desktop",
          "runs": runs, "cap_margin_ms": BLOCK_CAP_MARGIN_MS,
          "method": ("brand woff2 requests held for hold_ms after navigation commits, then released; the built CSS's brand "
                     "@font-face font-display rewritten in flight per value; FCP and LCP from PerformanceObserver"),
          "as_built_no_hold": _block_row(raw["as_built_no_hold"]),
          "control_other_font_held": {"what": ("the site's non-brand woff2 files held instead of the brand ones, CSS as built; "
                                               "if the delay is the same, it is not the brand @font-face or its display value"),
                                      "hold_ms": BLOCK_HOLDS_MS[-1], **_block_row(raw[control])},
          "hold_ms": {str(h): {d: _block_row(raw[f"{d}@{h}"]) for d in BLOCK_DISPLAYS} for h in BLOCK_HOLDS_MS}}
    bp["finding"] = block_finding(bp)
    return bp


def _median(runs: list[dict], key: str):
    vals = [r[key] for r in runs if r.get(key) is not None]
    return round(statistics.median(vals), 4) if vals else None


def series(browser, base, path, size, runs: int, variants: dict[str, tuple[str, bool]], throttle=False) -> dict:
    """`runs` fresh views per variant, variants alternated so drift hits them alike."""
    raw: dict[str, list] = {v: [] for v in variants}
    for i in range(runs):
        for v, (mode, strip) in variants.items():
            raw[v].append(page_run(browser, base, path, size, mode, strip, throttle, keep=i == 0))
    res = {}
    for v, rs in raw.items():
        mode = variants[v][0]
        slim = [{k: r[k] for k in ("lcp_ms", "cls", "font_bytes_before_load", "font_bytes_total", "pass",
                                   "heading_line_changes", "brand_drawn")
                 + (("fallback_stays", "brand_set_moved", "brand_dropped", "brand_status_final") if mode == "font_late" else ())}
                for r in rs]
        res[v] = {
            "mode": mode, "runs": len(rs), "throttle": SLOW_4G if throttle else None,
            **{f"median_{k}": _median(rs, k) for k in ("lcp_ms", "cls", "font_bytes_before_load", "font_bytes_total")},
            "max_cls": max((r["cls"] for r in rs if r["cls"] is not None), default=None),
            "cls_supported": any(r["cls"] is not None for r in rs),
            "arabic_brand_fetched": sorted({r["arabic_brand_fetched"] for r in rs}),
            "lcp_elements": sorted({json.dumps(r["lcp_element"], ensure_ascii=False) for r in rs}),
            "pass": all(r["pass"] for r in rs),
            "per_run": slim,
            "first_run": {k: rs[0][k] for k in FIRST_RUN_KEYS if k in rs[0]},
        }
    return res


def diagnostics(as_served: dict, font_late: dict) -> dict:
    """Recorded, not judged: the same probe drawn in the brand face (path a) and in the fallback
    (path b), first run of each. Glyph width compares single-line text only (a wrapped line's width
    is set by the wrap, not the glyphs)."""
    brand = {(r["kind"], r["selector"], r["text"]): r for r in as_served["first_run"]["probes"]}
    glyph, buttons, wrap = [], [], []
    for r in font_late["first_run"]["probes"]:
        b = brand.get((r["kind"], r["selector"], r["text"]))
        if b is None:
            continue
        if brand_set(r) and r["final"]["lines"] == b["final"]["lines"] == 1 and b["final"]["text_width"]:
            d = (r["final"]["text_width"] - b["final"]["text_width"]) / b["final"]["text_width"] * 100
            glyph.append({"kind": r["kind"], "text": r["text"][:60], "d_pct": round(d, 2)})
        elif brand_set(r) and r["final"]["lines"] != b["final"]["lines"]:
            wrap.append({"kind": r["kind"], "text": r["text"][:60],
                         "lines_fallback": r["final"]["lines"], "lines_brand": b["final"]["lines"]})
        if r["kind"] == "button":
            buttons.append({"text": r["text"][:60], "d_px": r["final"]["width"] - b["final"]["width"]})
    over_g = sorted((g for g in glyph if abs(g["d_pct"]) > DIAG_GLYPH_PCT), key=lambda g: -abs(g["d_pct"]))
    over_b = sorted((x for x in buttons if abs(x["d_px"]) > DIAG_BUTTON_PX), key=lambda x: -abs(x["d_px"]))
    return {
        "brand_drawn_in_as_served": as_served["first_run"]["brand_drawn"],
        "glyph_width": {"limit_pct": DIAG_GLYPH_PCT, "strings": len(glyph),
                        "max_abs_pct": max((abs(g["d_pct"]) for g in glyph), default=None),
                        "over": len(over_g), "worst": over_g[:8]},
        "button_width": {"limit_px": DIAG_BUTTON_PX, "buttons": len(buttons),
                         "max_abs_px": max((abs(x["d_px"]) for x in buttons), default=None),
                         "over": len(over_b), "worst": over_b[:8]},
        "wrap_differs_fallback_vs_brand": wrap,
    }


def collect(base: str, runs: int, names=ENGINES) -> dict:
    result = {
        "spec": "step 30: font-loading test (and step 17b: runtime line-height: normal) on the apps/www production build",
        "generated_by": "packages/brand-font/tools/font_loading.py",
        "server": base, "next_build_id": build_id(), "settle_ms": SETTLE_MS, "runs": runs,
        "font_display": "optional (brandLatin, brandArabic)",
        "rule": ("spec: a heading that changes line count during font swap fails, whatever the CLS (hard fail). "
                 f"Path a (as_served): zero heading line changes after first paint and CLS <= {CLS_MAX}. "
                 "Path b (font_late): the brand face is not applied after first paint (fallback stays) "
                 "and zero heading line changes. Every run of a case must pass."),
        "thresholds": {"cls_max": CLS_MAX, "heading_line_changes": 0, "fallback_width_eps_px": WIDTH_EPS,
                       "diagnostic_glyph_width_pct": DIAG_GLYPH_PCT, "diagnostic_button_width_px": DIAG_BUTTON_PX,
                       "status": "decided 2026-09-30 (A5 follow-up); diagnostics are recorded, not pass/fail"},
        "engines": {},
        "webkit_block_period": {"not_run": "webkit was not among the engines run"},
    }
    with engines(names) as it:
        for name, browser, err in it:
            if browser is None:
                result["engines"][name] = {"not_run": err}
                if name == "webkit":
                    result["webkit_block_period"] = {"not_run": err}
                continue
            if name == "webkit":
                result["webkit_block_period"] = webkit_block_period(browser, base, runs)
            e: dict = {"version": browser.version, "cases": {}}
            for loc, path in ROUTES.items():
                for w, size in WIDTHS.items():
                    variants = {"as_served": ("as_served", False), "font_late": ("font_late", False)}
                    if loc == "en":
                        variants["no_arabic_preload"] = ("as_served", True)
                    c = series(browser, base, path, size, runs, variants)
                    c["diagnostics"] = diagnostics(c["as_served"], c["font_late"])
                    e["cases"][f"{loc}/{w}"] = c
            if name == "chromium":
                e["slow_4g_en_mobile"] = series(browser, base, "/", WIDTHS["mobile"], runs,
                                                {"as_served": ("as_served", False),
                                                 "no_arabic_preload": ("as_served", True)}, throttle=True)
            result["engines"][name] = e
    finish(result)
    return result


def finish(result: dict) -> None:
    """Verdicts and summaries, from the per-run records only (the test recomputes them)."""
    ran = {n: e for n, e in result["engines"].items() if "not_run" not in e}
    paths = {p: bool(ran) and all(c[p]["pass"] for e in ran.values() for c in e["cases"].values())
             for p in ("as_served", "font_late")}
    result["browser_ok"] = bool(ran)
    result["paths"] = paths
    result["pass"] = all(paths.values())
    result["summary"] = summarize(result)
    result["line_height_normal"] = line_height_findings(result)


def summarize(result: dict) -> dict:
    out = {}
    for name, e in result["engines"].items():
        if "not_run" in e:
            out[name] = {"not_run": e["not_run"]}
            continue
        for case, c in e["cases"].items():
            a, b, d = c["as_served"], c["font_late"], c["diagnostics"]
            out[f"{name} {case}"] = {
                "as_served_pass": a["pass"], "font_late_pass": b["pass"],
                "as_served_line_changes": sorted({x["text"][:60] for r in a["per_run"] for x in r["heading_line_changes"]}),
                "font_late_line_changes": sorted({x["text"][:60] for r in b["per_run"] for x in r["heading_line_changes"]}),
                "fallback_stays_runs": sum(r["fallback_stays"] for r in b["per_run"]),
                "max_cls": a["max_cls"], "median_lcp_ms": a["median_lcp_ms"],
                "glyph_over_1_5_pct": d["glyph_width"]["over"], "glyph_max_abs_pct": d["glyph_width"]["max_abs_pct"],
                "button_over_33_px": d["button_width"]["over"], "button_max_abs_px": d["button_width"]["max_abs_px"],
            }
    return out


def line_height_findings(result: dict) -> dict:
    """Step 17b: unique (page, selector) with computed line-height normal, over engines, widths, paths."""
    found: dict[str, dict] = {}
    for name, e in result["engines"].items():
        for case, c in e.get("cases", {}).items():
            loc = case.split("/")[0]
            for p in ("as_served", "font_late"):
                for f in c[p]["first_run"]["line_height_normal"]:
                    k = f"{ROUTES[loc]} {f['selector']}"
                    seen = found.setdefault(k, {"page": ROUTES[loc], **f, "seen_in": []})["seen_in"]
                    if f"{name} {case}" not in seen:
                        seen.append(f"{name} {case}")
    return {"count": len(found), "findings": sorted(found.values(), key=lambda f: (f["page"], f["selector"]))}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base")
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--block-period-only", action="store_true",
                    help="re-measure only webkit_block_period and merge it into the existing report")
    a = ap.parse_args()
    base = base_url(a.base)
    if err := reachable(base):
        sys.exit(err)
    if a.block_period_only:
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        with engines(("webkit",)) as it:
            for _, browser, err in it:
                report["webkit_block_period"] = ({"not_run": err} if browser is None
                                                 else webkit_block_period(browser, base, a.runs))
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(report["webkit_block_period"], ensure_ascii=False, indent=1))
        return
    result = collect(base, a.runs)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    for k, v in result["summary"].items():
        print(k, json.dumps(v, ensure_ascii=False))
    for name, e in result["engines"].items():
        groups = {**{c: s for c, s in e.get("cases", {}).items() if c.startswith("en")},
                  **({"en/mobile/slow-4g": e["slow_4g_en_mobile"]} if "slow_4g_en_mobile" in e else {})}
        for case, s in groups.items():
            print(name, case, {v: (s[v]["median_font_bytes_before_load"], s[v]["median_lcp_ms"], s[v]["median_cls"])
                               for v in ("as_served", "no_arabic_preload")})
    print("line-height normal findings:", result["line_height_normal"]["count"])
    print("paths:", result["paths"], "pass:", result["pass"])
    print(f"wrote {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
