// Reads the pages the running site actually serves and returns, per route, the
// top-level <section>s inside <main> in render order. Server-rendered HTML is
// the source: Suspense chunks streamed out of order are spliced back into
// their placeholders first, so the order is the order a visitor sees.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decode(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
}

export function plainText(html) {
  return decode(
    html
      .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .replace(/ ([,.،:;!?])/g, "$1")
    .trim();
}

// Index just past the tag that closes the element whose open tag ends at `from`.
function closeOf(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].endsWith("/>")) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return { start: m.index, end: re.lastIndex };
  }
  return { start: html.length, end: html.length };
}

// React streams a resolved boundary as <div hidden id="S:n"> after the shell and
// leaves <!--$?--><template id="B:n"></template>fallback<!--/$--> in place.
export function resolveSuspense(html) {
  const chunks = new Map();
  const open = /<div hidden id="S:(\d+)">/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = open.exec(html))) {
    const { start, end } = closeOf(html, "div", open.lastIndex);
    chunks.set(m[1], html.slice(open.lastIndex, start));
    out += html.slice(last, m.index);
    last = end;
    open.lastIndex = end;
  }
  out += html.slice(last);

  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    out = out.replace(/<!--\$\?--><template id="B:(\d+)"><\/template>/g, (whole, id, offset) => {
      if (!chunks.has(id)) return whole;
      changed = true;
      return `\u0000${id}\u0000`;
    });
    // Drop each fallback up to its matching <!--/$--> and put the content there.
    out = out.replace(/\u0000(\d+)\u0000([\s\S]*)$/, function splice(_, id, rest) {
      let depth = 1;
      const re = /<!--(\$\??|\$!|\/\$)-->/g;
      let x;
      while ((x = re.exec(rest))) {
        depth += x[1] === "/$" ? -1 : 1;
        if (depth === 0) break;
      }
      const after = x ? rest.slice(re.lastIndex) : rest;
      const next = after.replace(/\u0000(\d+)\u0000([\s\S]*)$/, splice);
      return chunks.get(id) + next;
    });
    if (!changed) break;
  }
  return out;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
};
// useId values change whenever the tree changes; never key on them.
const stable = (id) => (id && !/^_?R_|^«|^:r/.test(id) ? id : undefined);

// The headings inside a section, one level down: its chapters, groups or steps.
function parts(body, own) {
  for (const level of ["h2", "h3"]) {
    const names = [];
    const re = new RegExp(`<${level}\\b[^>]*>`, "gi");
    let m;
    while ((m = re.exec(body))) {
      const text = plainText(body.slice(re.lastIndex, closeOf(body, level, re.lastIndex).start));
      if (text && text !== own && !names.includes(text)) names.push(text);
    }
    if (names.length) return names.slice(0, 16);
  }
  return [];
}

export function sections(html) {
  const doc = resolveSuspense(html);
  const mainAt = doc.search(/<main\b/);
  if (mainAt < 0) return [];
  const mainOpenEnd = doc.indexOf(">", mainAt) + 1;
  const main = doc.slice(mainOpenEnd, closeOf(doc, "main", mainOpenEnd).start);

  const found = [];
  const re = /<(section|article)\b[^>]*>/gi;
  let m;
  while ((m = re.exec(main))) {
    const tag = m[0];
    const { start, end } = closeOf(main, m[1], re.lastIndex);
    const body = main.slice(re.lastIndex, start);
    re.lastIndex = end; // top-level only: nested sections belong to this one

    const id = attr(tag, "id");
    const labelledBy = attr(tag, "aria-labelledby");
    let heading;
    if (labelledBy) {
      const el = body.match(new RegExp(`<(h[1-6]|p|span|div)\\b[^>]*\\sid="${labelledBy}"[^>]*>`));
      if (el) {
        const from = body.indexOf(el[0]) + el[0].length;
        heading = plainText(body.slice(from, closeOf(body, el[1], from).start));
      }
    }
    if (!heading) {
      const h = body.match(/<(h[1-6])\b[^>]*>/);
      if (h) {
        const from = body.indexOf(h[0]) + h[0].length;
        heading = plainText(body.slice(from, closeOf(body, h[1], from).start));
      }
    }
    heading ??= attr(tag, "aria-label");
    // No heading at all: name it by its first words (usually the eyebrow), and
    // key it by the first two so a template section keys the same on every page.
    const words = heading ? [] : plainText(body).split(" ");
    heading ||= plainText(body.replace(/<\/?[a-z][^>]*>/gi, "\u0001").split("\u0001").find((t) => plainText(t)) ?? "");
    const slug = (words.length ? words.slice(0, 2).join(" ") : heading ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    found.push({
      key: stable(id) ?? stable(labelledBy) ?? (slug || `section-${found.length + 1}`),
      heading: heading || "",
      parts: parts(body, heading),
    });
  }
  if (!found.length) {
    const h = main.match(/<h1\b[^>]*>/);
    if (h) {
      const from = main.indexOf(h[0]) + h[0].length;
      found.push({ key: "page", heading: plainText(main.slice(from, closeOf(main, "h1", from).start)), parts: [] });
    }
  }
  return found;
}

export async function fetchPage(base, path, locale) {
  const res = await fetch(new URL(path, base), {
    headers: { cookie: `NEXT_LOCALE=${locale}` },
    redirect: "follow",
  });
  return { status: res.status, html: await res.text() };
}

export function links(html, prefix) {
  const set = new Set();
  const re = new RegExp(`href="(${prefix}/[a-z0-9-]+)"`, "g");
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return [...set];
}
