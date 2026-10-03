"""Font payload baseline from the real apps/www production build (spec step 23).

Usage: uv run python tools/payload.py [--base http://127.0.0.1:3020]

Needs `bun run build` in apps/www and `next start` serving that build at --base (default
$WWW_BASE, else http://127.0.0.1:3020). Nothing here starts or stops a server.

Measured, never estimated:
- Latin / Arabic: the woff2 files the build actually serves (apps/www/.next/static/media), with
  their SHA-256 checked against dist/web so the number is the file this package built.
- Initial EN / AR: every font response Chromium receives for `/` and `/ar` before the window
  `load` event, at desktop (1440x900) and mobile (390x844) width, in a fresh context with service
  workers blocked (the PWA worker would otherwise answer from its own cache on a repeat visit).
  Bytes are the response body as sent (woff2 is not re-compressed by next start; content-encoding
  is recorded to prove it). The route figure is the larger of the two widths.

Writes dist/payload-report.json ({"route_kb": {"en": n, "ar": n}, ...}), which tools/build.py
reads into payload.route_kb, and prints the line CI shows:
  Measured: Latin xx KB / Arabic xx KB / Initial EN xx KB / Initial AR xx KB
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.request
from urllib.parse import urlparse
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

from browser import REPO
from config import ROOT, load

WWW = REPO / "apps" / "www"
MEDIA = WWW / ".next" / "static" / "media"
REPORT = ROOT / "dist" / "payload-report.json"
ROUTES = {"en": "/", "ar": "/ar"}
WIDTHS = {"desktop": (1440, 900), "mobile": (390, 844)}
FONT_URL = r"\.(woff2?|ttf|otf)(\?|$)"

# CSSFontFaceRule -> {url path: {family, unicode_range}} for every stylesheet on the page, so each
# fetched file is named by the @font-face that asked for it (next/font renames to brandLatin etc.).
FACES_JS = r"""
() => {
  const out = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const src = r.style.getPropertyValue("src");
      for (const m of src.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const path = new URL(m[1], sheet.href || location.href).pathname;
        out[path] = { family: r.style.getPropertyValue("font-family").replace(/["']/g, ""),
                      unicode_range: r.style.getPropertyValue("unicode-range") || null };
      }
    }
  }
  return out;
}
"""


def kb(n: int) -> float:
    return round(n / 1024, 1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def base_url(arg: str | None) -> str:
    return (arg or os.environ.get("WWW_BASE") or "http://127.0.0.1:3020").rstrip("/")


def reachable(base: str) -> str | None:
    try:
        urllib.request.urlopen(base + "/", timeout=5).read(1)
        return None
    except Exception as e:  # noqa: BLE001 — the message is the evidence
        return f"{base} not reachable ({e}); run `bun run build && next start` in apps/www"


def font_faces(page: Page) -> dict:
    return page.evaluate(FACES_JS)


def build_id() -> str | None:
    p = WWW / ".next" / "BUILD_ID"
    return p.read_text().strip() if p.exists() else None


def brand_files(cfg) -> dict:
    """The two brand woff2 files: dist/web bytes and the copy the build serves, which must match."""
    out = {}
    for key, fam in cfg.families.items():
        dist = ROOT / "dist" / "web" / fam.output
        stem = fam.output.removesuffix(".woff2").replace("-", "_")
        served = sorted(MEDIA.glob(f"{stem}*.woff2")) if MEDIA.exists() else []
        s = served[0] if len(served) == 1 else None
        out[key] = {
            "file": fam.output,
            "bytes": dist.stat().st_size,
            "kb": kb(dist.stat().st_size),
            "sha256": sha256(dist),
            "served_as": s.name if s else None,
            "served_matches_dist": (sha256(s) == sha256(dist)) if s else None,
        }
    return out


def measure_route(browser, base: str, path: str, size: tuple[int, int]) -> dict:
    """Fonts fetched before `load` (and after it, until network idle) for one fresh page view."""
    ctx = browser.new_context(viewport={"width": size[0], "height": size[1]}, service_workers="block")
    page = ctx.new_page()
    seen: list[tuple] = []
    state = {"loaded": False}

    def on_finished(req) -> None:
        if req.resource_type == "font":
            seen.append((req, not state["loaded"]))

    page.on("requestfinished", on_finished)
    page.on("load", lambda: state.__setitem__("loaded", True))
    page.goto(base + path, wait_until="load")
    page.wait_for_load_state("networkidle")
    faces = font_faces(page)
    preloads = page.evaluate(
        "() => [...document.querySelectorAll('link[rel=preload][as=font]')].map(l => new URL(l.href).pathname)")
    fonts = []
    for req, before in seen:
        resp = req.response()
        body = resp.body() if resp else b""
        fonts.append({"path": urlparse(req.url).path, "status": resp.status if resp else None,
                      "bytes": len(body), "content_encoding": resp.headers.get("content-encoding") if resp else None,
                      "before_load": before})
    ctx.close()
    for f in fonts:
        face = faces.get(f["path"], {})
        f["family"] = face.get("family")
        f["preloaded"] = f["path"] in preloads
        f["file"] = Path(f["path"]).name
        f["kb"] = kb(f["bytes"])
    initial = [f for f in fonts if f["before_load"]]
    return {
        "viewport": list(size),
        "fonts": sorted(fonts, key=lambda f: (not f["before_load"], f["file"])),
        "initial_bytes": sum(f["bytes"] for f in initial),
        "initial_kb": kb(sum(f["bytes"] for f in initial)),
        "initial_brand_kb": kb(sum(f["bytes"] for f in initial if (f["family"] or "").startswith("brand"))),
        "after_load_kb": kb(sum(f["bytes"] for f in fonts if not f["before_load"])),
        "preloaded_fonts": len(preloads),
    }


def collect(base: str) -> dict:
    cfg = load()
    files = brand_files(cfg)
    routes: dict = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for loc, path in ROUTES.items():
            routes[loc] = {"path": path, "widths": {w: measure_route(browser, base, path, s) for w, s in WIDTHS.items()}}
            routes[loc]["kb"] = max(v["initial_kb"] for v in routes[loc]["widths"].values())
        version = browser.version
        browser.close()
    return {
        "spec": "step 23: font payload baseline from the apps/www production build",
        "generated_by": "packages/brand-font/tools/payload.py",
        "server": base,
        "next_build_id": build_id(),
        "engine": f"chromium {version}",
        "methods": {
            "files": "dist/web woff2 size; served_as is the copy in apps/www/.next/static/media, sha-checked",
            "initial": "font responses (resource type font) finished before window load, fresh context, "
                       "service workers blocked; body bytes as sent",
            "route_kb": "max of desktop 1440x900 and mobile 390x844 initial_kb; KB = bytes / 1024, 1 decimal",
        },
        "files": files,
        "route_kb": {loc: routes[loc]["kb"] for loc in ROUTES},
        "routes": routes,
    }


def budget_violations(rep: dict, budgets) -> list[str]:
    """Every measured number in `rep` above its budget in config/font.yaml (`budgets`), as text.
    Empty means within budget. Enforced budgets must all be set (config.py refuses nulls)."""
    out = []
    checks = [("latin woff2", rep["files"]["latin"]["kb"], budgets.latin_woff2_kb),
              ("arabic woff2", rep["files"]["arabic"]["kb"], budgets.arabic_woff2_kb)]
    checks += [(f"initial {loc} route", rep["route_kb"][loc], budgets.initial_route_font_kb.get(loc))
               for loc in ("en", "ar")]
    for name, got, limit in checks:
        if limit is not None and got > limit:
            out.append(f"{name}: {got} KB > budget {limit} KB")
    return out


def measured_line(rep: dict) -> str:
    f, r = rep["files"], rep["route_kb"]
    return (f"Measured: Latin {f['latin']['kb']} KB / Arabic {f['arabic']['kb']} KB / "
            f"Initial EN {r['en']} KB / Initial AR {r['ar']} KB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base")
    ap.add_argument("--print-only", action="store_true", help="print the committed report's line, measure nothing")
    a = ap.parse_args()
    if a.print_only:
        print(measured_line(json.loads(REPORT.read_text())))
        return
    base = base_url(a.base)
    if err := reachable(base):
        sys.exit(err)
    rep = collect(base)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(rep, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    for loc, r in rep["routes"].items():
        for w, v in r["widths"].items():
            names = ", ".join(f"{f['family']} {f['kb']}" for f in v["fonts"] if f["before_load"])
            print(f"{loc} {w}: {v['initial_kb']} KB before load ({names}); after load {v['after_load_kb']} KB")
    print(measured_line(rep))
    print(f"wrote {REPORT.relative_to(ROOT)}")
    cfg = load()
    if cfg.budgets.enforced and (bad := budget_violations(rep, cfg.budgets)):
        sys.exit("over budget: " + "; ".join(bad))


if __name__ == "__main__":
    main()
