#!/usr/bin/env node
// Site mind map: every page, its sections in render order, and the goal of each
// section. Structure is read from the running site (default the dev server on
// :3010, override with SITE_MAP_URL); goals are written by hand in
// docs/site-map/goals.json. Output: docs/site-map/index.html + site-map.json.
//
//   bun run site-map            regenerate
//   bun run site-map --check    also exit 1 when a section has no goal or a goal
//                               points at a section that no longer exists

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPage, links, sections } from "./extract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const www = join(here, "..", "..");
const out = join(www, "..", "..", "docs", "site-map");
const base = process.env.SITE_MAP_URL ?? "http://localhost:3010";
const check = process.argv.includes("--check");
const NOT_FOUND = "/__site-map-not-found";

// Routes come from the app directory, so a new page appears without editing this file.
function routes() {
  const root = join(www, "app", "[locale]");
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === "page.tsx") {
        const route =
          "/" +
          relative(root, dir)
            .split(sep)
            .filter((part) => part && !/^\(.*\)$/.test(part))
            .join("/");
        found.push(route);
      }
    }
  };
  walk(root);
  return found.sort();
}

async function instances(route) {
  if (route.includes("[...")) return [NOT_FOUND];
  if (!route.includes("[")) return [route];
  const parent = route.slice(0, route.indexOf("/["));
  const { html } = await fetchPage(base, parent || "/", "en");
  return links(html, parent);
}

// AR comes from the same tree, so position matches; EN decides the key.
async function read(path, dynamic) {
  const en = await fetchPage(base, path, "en");
  const ar = await fetchPage(base, `/ar${path === "/" ? "" : path}`, "ar");
  const enSections = sections(en.html);
  const arSections = sections(ar.html);
  // On a template route the opening section is titled after the instance.
  if (dynamic && enSections[0] && enSections[0].key !== "header") enSections[0].key = "header";
  return {
    status: en.status,
    sections: enSections.map((s, i) => ({
      ...s,
      headingAr: arSections[i]?.heading ?? "",
      partsAr: arSections[i]?.parts ?? [],
    })),
  };
}

async function main() {
  try {
    await fetch(base, { method: "HEAD" });
  } catch {
    console.error(`site-map: nothing answers at ${base}. Start the site first (bun run dev --filter=www) or set SITE_MAP_URL.`);
    process.exit(1);
  }

  const goalsPath = join(out, "goals.json");
  const goals = existsSync(goalsPath) ? JSON.parse(readFileSync(goalsPath, "utf8")) : { pages: {} };
  const pages = [];
  const missing = [];
  const unreachable = [];

  for (const route of routes()) {
    const paths = await instances(route);
    const label = route.includes("[...") ? "(404)" : route;
    const merged = new Map();
    let status = 0;
    for (const path of paths) {
      const page = await read(path, paths.length > 1 || route.includes("["));
      status = page.status;
      for (const s of page.sections) {
        const seen = merged.get(s.key);
        if (seen) seen.count++;
        else merged.set(s.key, { ...s, count: 1 });
      }
    }
    if (!merged.size) unreachable.push(`${label} (HTTP ${status}, no server-rendered sections)`);
    const g = goals.pages[label] ?? {};
    const list = [...merged.values()].map((s) => {
      const goal = g.sections?.[s.key] ?? "";
      if (!goal) missing.push(`${label} → ${s.key}`);
      return {
        key: s.key,
        heading: s.heading,
        headingAr: s.headingAr,
        parts: s.parts,
        partsAr: s.partsAr,
        goal,
        ...(paths.length > 1 && s.count < paths.length ? { onlyOn: `${s.count} / ${paths.length}` } : {}),
      };
    });
    pages.push({
      route: label,
      group: g.group ?? "New",
      goal: g.goal ?? "",
      primaryCta: g.primaryCta ?? "",
      instances: paths.length > 1 ? paths : undefined,
      sections: list,
    });
  }

  // Hand-kept entries: things outside <main> (navigation, footer, overlays).
  for (const [label, g] of Object.entries(goals.pages)) {
    if (!g.manual) continue;
    pages.unshift({
      route: label,
      group: g.group,
      goal: g.goal,
      primaryCta: g.primaryCta ?? "",
      manual: true,
      sections: Object.entries(g.sections).map(([key, goal]) => ({ key, heading: key, headingAr: "", goal })),
    });
  }

  const live = new Set(pages.map((p) => p.route));
  const orphaned = [];
  for (const [label, g] of Object.entries(goals.pages)) {
    if (g.manual) continue;
    if (!live.has(label)) {
      orphaned.push(`${label} (page gone)`);
      continue;
    }
    const keys = new Set(pages.find((p) => p.route === label).sections.map((s) => s.key));
    for (const key of Object.keys(g.sections ?? {})) if (!keys.has(key)) orphaned.push(`${label} → ${key}`);
  }

  const data = {
    generatedAt: new Date().toISOString(),
    source: base,
    pages,
    report: { missing, orphaned, unreachable },
  };
  writeFileSync(join(out, "site-map.json"), JSON.stringify(data, null, 2) + "\n");
  const template = readFileSync(join(here, "template.html"), "utf8");
  writeFileSync(
    join(out, "index.html"),
    template.replace("__DATA__", () => JSON.stringify(data).replace(/</g, "\\u003c")),
  );

  const count = pages.reduce((n, p) => n + p.sections.length, 0);
  console.log(`site-map: ${pages.length} pages, ${count} sections → ${relative(process.cwd(), join(out, "index.html"))}`);
  const list = (title, items) => items.length && console.log(`\n${title} (${items.length}):\n  ${items.join("\n  ")}`);
  list("Sections with no goal yet — add them to docs/site-map/goals.json", missing);
  list("Goals whose section no longer exists — rename the key or delete it", orphaned);
  list("Pages with nothing to read", unreachable);
  if (check && (missing.length || orphaned.length)) process.exit(1);
}

main();
