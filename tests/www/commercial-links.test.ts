import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  getCommercialCta,
  maintenancePlanHref,
  type CommercialCtaKey,
} from "../../apps/www/lib/config/commercial";
import { MAINTENANCE_PLAN_IDS } from "@repo/pricing-schema";

// Every commercial CTA must land on a real page, a real anchor and a contact
// prefill the form actually accepts. The catch-all [...rest] route would
// otherwise turn a typo into a silent 404.

const WWW = join(import.meta.dir, "../../apps/www");
const APP = join(WWW, "app/[locale]");

// Keys are read from the registry source so a new CTA is tested without
// anyone remembering to list it here.
const CTA_KEYS = (() => {
  const src = readFileSync(join(WWW, "lib/config/commercial.ts"), "utf8");
  const block = /const COMMERCIAL_CTAS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src);
  if (!block) throw new Error("COMMERCIAL_CTAS not found in lib/config/commercial.ts");
  return [...block[1].matchAll(/^\s*"?([\w-]+)"?\s*:/gm)].map((m) => m[1] as CommercialCtaKey);
})();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Route patterns from page.tsx files, with (groups) removed. "[...rest]" is the
// 404 catch-all and is deliberately not a match for anything.
const ROUTES = walk(APP)
  .filter((f) => f.endsWith(`${sep}page.tsx`))
  .map((f) => relative(APP, f).split(sep).slice(0, -1))
  .filter((segments) => !segments.some((s) => s.startsWith("[...")))
  .map((segments) => segments.filter((s) => !/^\(.*\)$/.test(s)));

function routeExists(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return ROUTES.some(
    (route) =>
      route.length === parts.length &&
      route.every((seg, i) => /^\[[^.].*\]$/.test(seg) || seg === parts[i]),
  );
}

const SOURCE = [...walk(join(WWW, "app")), ...walk(join(WWW, "components"))]
  .filter((f) => /\.(tsx?|mdx)$/.test(f))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

function contactServices(): string[] {
  const src = readFileSync(join(APP, "(main)/(marketing)/contact/page-client.tsx"), "utf8");
  const block = /const SERVICES = \[([\s\S]*?)\]/.exec(src);
  if (!block) throw new Error("SERVICES list not found in the contact page");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("commercial CTA registry", () => {
  test("the registry and the route table were discovered", () => {
    expect(CTA_KEYS.length).toBeGreaterThan(0);
    expect(routeExists("/")).toBe(true);
    expect(routeExists("/no-such-page")).toBe(false);
  });

  for (const key of CTA_KEYS) {
    test(`${key} resolves to a real page, anchor and prefill`, () => {
      const href = getCommercialCta(key).href;
      const url = new URL(href, "https://example.test");
      expect(href.startsWith("/")).toBe(true);
      expect(routeExists(url.pathname)).toBe(true);

      if (url.hash) {
        const id = url.hash.slice(1);
        expect(SOURCE.includes(`"${id}"`)).toBe(true);
      }

      const service = url.searchParams.get("service");
      if (service !== null) expect(contactServices()).toContain(service);
    });
  }

  test("maintenance plan links carry a plan the contact form recognises", () => {
    for (const id of MAINTENANCE_PLAN_IDS) {
      for (const billing of ["monthly", "annual"] as const) {
        const url = new URL(maintenancePlanHref(id, billing), "https://example.test");
        expect(routeExists(url.pathname)).toBe(true);
        expect(contactServices()).toContain(url.searchParams.get("service")!);
        expect(url.searchParams.get("plan")).toBe(id);
        expect(url.searchParams.get("billing")).toBe(billing);
      }
    }
  });
});
