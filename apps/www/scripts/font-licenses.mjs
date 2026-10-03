// Serves the Altruvex Sans licence texts at /fonts/licenses/<file>.
//
// The SIL OFL requires the licence to accompany the font software wherever it is
// distributed, and serving the woff2 is distribution. The single source is
// packages/brand-font/licenses; public/fonts/licenses is a gitignored build
// artefact copied from it, so the two cannot drift and nothing is committed twice.
//
//   node scripts/font-licenses.mjs           copy (runs before dev and build)
//   node scripts/font-licenses.mjs --check   exit 1 if the served copy differs
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules/@repo/brand-font/licenses");
const served = join(root, "public/fonts/licenses");

const list = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".")).sort() : []);
const sources = list(source);

if (sources.length === 0) {
  console.error(`font-licenses: no licence files found in ${source}`);
  process.exit(1);
}

if (process.argv.includes("--check")) {
  const problems = [];
  const have = new Set(list(served));
  for (const f of sources) {
    if (!have.has(f)) problems.push(`missing   ${f}`);
    else if (!readFileSync(join(source, f)).equals(readFileSync(join(served, f)))) problems.push(`differs   ${f}`);
  }
  for (const f of have) if (!sources.includes(f)) problems.push(`stale     ${f}`);
  if (problems.length) {
    console.error(`font-licenses: ${served} is out of step with the package:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`font-licenses: ${sources.length} files match the package`);
} else {
  rmSync(served, { recursive: true, force: true });
  mkdirSync(served, { recursive: true });
  for (const f of sources) writeFileSync(join(served, f), readFileSync(join(source, f)));
  console.log(`font-licenses: copied ${sources.length} files to public/fonts/licenses`);
}
