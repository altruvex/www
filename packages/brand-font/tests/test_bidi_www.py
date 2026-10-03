"""Bidi rendering of apps/www copy (spec step 20): the real AR/EN message strings, in the DOM
shape their component renders, measured in each Playwright engine.

The cases come from `bun run check:bidi` in apps/www, which reads the message files, writes them
into dist/bidi-report.json and then runs this file. Each case has the shipped rendering (`fixed`)
and, where a fix was made, the rendering without it (`control`). Two things are measured, with
Range rects over text offsets (no spans are added around tokens):

- order: token centres sorted by x = visual left-to-right order, against the order expected
  from the Unicode Bidi Algorithm;
- breaks: the container is swept from the unit's own width up to the natural width in 2px steps,
  and every `units` substring must keep all of its characters on one line at every width.

`fixed` is asserted. `control` is recorded only, as evidence that the fix answers a real
misrender (control_reproduces). Engines that do not launch are recorded as not run, never passed.
"""
from __future__ import annotations

import json

import pytest

from browser import ENGINES, engines, open_page, serve
from config import ROOT

pytestmark = pytest.mark.browser

REPORT = ROOT / "dist" / "bidi-report.json"
# What apps/www ships today (Outfit + Vazirmatn) and the Track A production stack.
STACKS = {"en": ("--stack-live-en", "--stack-prod-en"), "ar": ("--stack-live-ar", "--stack-prod-ar")}

MEASURE = r"""
({ cases, stacks }) => {
  const root = document.getElementById("bidi-root");
  const WS = /\s/u;

  function textMap(el) {
    const nodes = [];
    let text = "";
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      nodes.push({ node: n, start: text.length });
      text += n.data;
    }
    const at = (i) => {
      for (let k = nodes.length - 1; k >= 0; k--) {
        if (i >= nodes[k].start) return [nodes[k].node, Math.min(i - nodes[k].start, nodes[k].node.data.length)];
      }
      return [nodes[0].node, 0];
    };
    return { text, at };
  }

  function rect(map, a, b) {
    const r = document.createRange();
    r.setStart(...map.at(a));
    r.setEnd(...map.at(b));
    const rs = [...r.getClientRects()].filter((x) => x.width > 0);
    if (!rs.length) return null;
    const left = Math.min(...rs.map((x) => x.left)), right = Math.max(...rs.map((x) => x.right));
    const top = Math.min(...rs.map((x) => x.top)), bottom = Math.max(...rs.map((x) => x.bottom));
    return { left, right, top, bottom };
  }

  function order(el, c) {
    const map = textMap(el);
    const found = [];
    let from = 0;
    for (const t of c.tokens) {
      const i = map.text.indexOf(t, from);
      if (i < 0) return { visual: null, expected: c.expected, pass: false, error: `token not found: ${t}` };
      const r = rect(map, i, i + t.length);
      found.push({ t, x: r ? (r.left + r.right) / 2 : NaN });
      from = i + t.length;
    }
    const visual = found.slice().sort((a, b) => a.x - b.x).map((f) => f.t);
    const pass = visual.length === c.expected.length && visual.every((t, k) => t === c.expected[k]);
    return { visual, expected: c.expected, pass };
  }

  // Lines a unit spans: per-character rect centres, grouped within half a line height.
  function unitLines(map, i, len, lh) {
    const ys = [];
    for (let k = i; k < i + len; k++) {
      if (WS.test(map.text[k]) && map.text[k] !== " ") continue;
      const r = rect(map, k, k + 1);
      if (r) ys.push((r.top + r.bottom) / 2);
    }
    ys.sort((a, b) => a - b);
    let lines = ys.length ? 1 : 0;
    for (let k = 1; k < ys.length; k++) if (ys[k] - ys[k - 1] > lh / 2) lines++;
    return lines;
  }

  function breaks(box, el, units) {
    const map = textMap(el);
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    const out = [];
    for (const u of units || []) {
      const i = map.text.indexOf(u);
      if (i < 0) { out.push({ unit: u, pass: false, error: "unit not found" }); continue; }
      box.style.width = "max-content";
      el.style.whiteSpace = "nowrap";
      const natural = box.getBoundingClientRect().width;
      const own = rect(map, i, i + u.length);
      el.style.whiteSpace = "";
      const min = Math.ceil(own.right - own.left) + 1;
      const split = [];
      for (let w = min; w <= Math.ceil(natural); w += 2) {
        box.style.width = w + "px";
        if (unitLines(map, i, u.length, lh) > 1) split.push(w);
      }
      box.style.width = "max-content";
      out.push({ unit: u, widths_px: [min, Math.ceil(natural)], split_at_px: split.slice(0, 5),
                 split_count: split.length, pass: split.length === 0 });
    }
    return out;
  }

  const results = [];
  for (const c of cases) {
    const res = { id: c.id, stacks: {} };
    for (const stack of stacks[c.lang]) {
      const per = {};
      for (const variant of ["fixed", "control"]) {
        if (c[variant] == null) continue;
        const box = document.createElement("div");
        box.dir = c.dir;
        box.lang = c.lang;
        box.style.cssText = `font-family: var(${stack}); font-size: 32px; line-height: 1.5; width: max-content;`;
        box.innerHTML = c[variant];
        root.append(box);
        const el = box.firstElementChild;
        el.style.whiteSpace = "nowrap";
        const o = order(el, c);
        el.style.whiteSpace = "";
        const b = breaks(box, el, variant === "control" ? c.control_units : c.units);
        per[variant] = { order: o, breaks: b, pass: o.pass && b.every((x) => x.pass) };
        box.remove();
      }
      res.stacks[stack] = per;
    }
    results.push(res);
  }
  return JSON.stringify(results);
}
"""


def _load() -> dict:
    if not REPORT.exists():
        pytest.skip("no dist/bidi-report.json: run `bun run check:bidi` in apps/www")
    rep = json.loads(REPORT.read_text(encoding="utf-8"))
    if not rep.get("cases"):
        pytest.skip("bidi-report.json has no cases: run `bun run check:bidi` in apps/www")
    return rep


@pytest.fixture(scope="session")
def rendered():
    rep = _load()
    cases = rep["cases"]
    result: dict[str, dict] = {}
    with serve() as base, engines() as it:
        for name, browser, err in it:
            if browser is None:
                result[name] = {"not_run": err}
                continue
            # The proofs directory listing is same-origin with fonts.css and the font files.
            page = open_page(browser, base, width=1600, height=1000)
            page.evaluate("""() => {
              document.head.innerHTML = '<meta charset="utf-8"><link rel="stylesheet" href="fonts.css">';
              document.body.innerHTML = '<div id="bidi-root"></div>';
            }""")
            page.wait_for_function("document.styleSheets.length > 0")
            page.evaluate("""async () => {
              for (const f of ["Altruvex Sans Latin", "Altruvex Sans Arabic", "Live Outfit", "Live Vazirmatn"])
                await document.fonts.load(`32px "${f}"`, "aAب");
              await document.fonts.ready;
            }""")
            data = json.loads(page.evaluate(MEASURE, {"cases": cases, "stacks": STACKS}))
            page.close()
            per_case = {}
            for r in data:
                fixed_pass = all(s["fixed"]["pass"] for s in r["stacks"].values())
                ctl = [s["control"]["pass"] for s in r["stacks"].values() if "control" in s]
                per_case[r["id"]] = {
                    "pass": fixed_pass,
                    "control_reproduces": (not all(ctl)) if ctl else None,
                    "stacks": r["stacks"],
                }
            result[name] = {"version": browser.version, "cases": per_case,
                            "pass": all(c["pass"] for c in per_case.values())}
    rep["engines"] = result
    run = [e for e in result.values() if "not_run" not in e]
    rep["browser_ok"] = bool(run) and all(e["pass"] for e in run)
    rep["ok"] = rep["static"]["ok"] and rep["browser_ok"]
    REPORT.write_text(json.dumps(rep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


@pytest.mark.parametrize("engine", ENGINES)
def test_order_and_breaks(rendered, engine):
    e = rendered[engine]
    if "not_run" in e:
        pytest.skip(f"{engine} did not launch: {e['not_run']}")
    bad = []
    for cid, c in e["cases"].items():
        for stack, s in c["stacks"].items():
            f = s["fixed"]
            if not f["order"]["pass"]:
                bad.append(f"{cid} [{stack}] order {f['order']['visual']} != {f['order']['expected']}")
            for b in f["breaks"]:
                if not b["pass"]:
                    bad.append(f"{cid} [{stack}] '{b['unit']}' split at {b.get('split_at_px')}px")
    assert not bad, f"{engine}: " + "; ".join(bad)
