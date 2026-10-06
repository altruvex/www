import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The EN and AR catalogues must carry the same keys, the same array lengths and
// the same ICU placeholders, or one locale renders a raw key / an unfilled {token}.

const WWW = join(import.meta.dir, "../../apps/www");
const MESSAGES = join(WWW, "messages");

function registeredNamespaces(): string[] {
  const source = readFileSync(join(WWW, "i18n/request.ts"), "utf8");
  const block = /const NAMESPACES = \[([\s\S]*?)\]/.exec(source);
  if (!block) throw new Error("NAMESPACES array not found in apps/www/i18n/request.ts");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function jsonFiles(locale: string): string[] {
  return readdirSync(join(MESSAGES, locale))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

type Flat = Map<string, string>;

function flatten(node: unknown, path: string, out: Flat): Flat {
  if (Array.isArray(node)) {
    out.set(`${path}#length`, String(node.length));
    node.forEach((v, i) => flatten(v, `${path}[${i}]`, out));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) flatten(v, path ? `${path}.${k}` : k, out);
  } else {
    out.set(path, typeof node === "string" ? node : `<${typeof node}>`);
  }
  return out;
}

function load(locale: string, ns: string): Flat {
  return flatten(JSON.parse(readFileSync(join(MESSAGES, locale, `${ns}.json`), "utf8")), "", new Map());
}

// ICU argument names a message reads: {name}, {n, number}, and simple arguments
// nested inside plural/select branches. Plural/select selectors themselves
// ({count, plural, ...}) are not compared, because Arabic legitimately pluralises
// where English does not; branch bodies ("one {day}") are text, not arguments.
const BRANCHING = new Set(["plural", "select", "selectordinal"]);

function placeholders(message: string): string[] {
  const names = new Set<string>();
  let i = 0;

  const skipSpace = () => {
    while (i < message.length && /\s/.test(message[i])) i++;
  };
  const readUntil = (stops: string) => {
    const from = i;
    while (i < message.length && !stops.includes(message[i])) i++;
    return message.slice(from, i).trim();
  };

  // Parses text until an unmatched "}" (consumed) or the end.
  const parseText = (): void => {
    while (i < message.length) {
      const ch = message[i];
      if (ch === "'" && message[i + 1] === "'") i += 2;
      else if (ch === "{") {
        i++;
        parseArgument();
      } else if (ch === "}") {
        i++;
        return;
      } else i++;
    }
  };

  // Called just after "{".
  const parseArgument = (): void => {
    const name = readUntil(",}");
    if (message[i] === "}") {
      i++;
      if (name) names.add(name);
      return;
    }
    i++; // ","
    const type = readUntil(",}");
    if (!BRANCHING.has(type)) {
      if (name) names.add(name);
      let depth = 1;
      while (i < message.length && depth > 0) {
        if (message[i] === "{") depth++;
        else if (message[i] === "}") depth--;
        i++;
      }
      return;
    }
    if (message[i] === ",") i++;
    for (;;) {
      skipSpace();
      if (i >= message.length) return;
      if (message[i] === "}") {
        i++;
        return;
      }
      readUntil("{}");
      if (message[i] === "{") {
        i++;
        parseText();
      }
    }
  };

  parseText();
  return [...names].sort();
}

const namespaces = registeredNamespaces();

describe("ICU placeholder parser", () => {
  test("reads simple, typed and nested arguments but not selectors or branch text", () => {
    expect(placeholders("{n} {n, plural, one {day} other {days}}")).toEqual(["n"]);
    expect(placeholders("{count, plural, one {# min} other {{minutes} min}}")).toEqual(["minutes"]);
    expect(placeholders("{rate, number, percent} of {total}")).toEqual(["rate", "total"]);
    expect(placeholders("no arguments")).toEqual([]);
    expect(placeholders("{a} and {b}")).not.toEqual(placeholders("{a}"));
  });
});

describe("i18n catalogue", () => {
  test("every registered namespace has an EN and an AR file, and no file is unregistered", () => {
    expect(namespaces.length).toBeGreaterThan(0);
    expect(jsonFiles("en")).toEqual([...namespaces].sort());
    expect(jsonFiles("ar")).toEqual([...namespaces].sort());
  });

  for (const ns of namespaces) {
    describe(ns, () => {
      const en = load("en", ns);
      const ar = load("ar", ns);

      test("EN and AR have the same keys and array lengths", () => {
        const missingInAr = [...en.keys()].filter((k) => !ar.has(k));
        const missingInEn = [...ar.keys()].filter((k) => !en.has(k));
        expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
        for (const [k, v] of en) if (k.endsWith("#length")) expect(`${k}=${ar.get(k)}`).toBe(`${k}=${v}`);
      });

      test("no message is empty in one locale only", () => {
        const lopsided = [...en.keys()].filter(
          (k) => ar.has(k) && (en.get(k)!.trim() === "") !== (ar.get(k)!.trim() === ""),
        );
        expect(lopsided).toEqual([]);
      });

      test("EN and AR use the same ICU placeholders", () => {
        const mismatched: string[] = [];
        for (const [k, v] of en) {
          const other = ar.get(k);
          if (other === undefined || k.endsWith("#length")) continue;
          const a = placeholders(v).join(",");
          const b = placeholders(other).join(",");
          if (a !== b) mismatched.push(`${k}: en{${a}} ar{${b}}`);
        }
        expect(mismatched).toEqual([]);
      });
    });
  }
});
