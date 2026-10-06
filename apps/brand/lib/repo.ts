import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

let root: string | null = null;

/** The monorepo root: the nearest folder above cwd that holds turbo.json. */
export function repoRoot(): string {
  if (root) return root;
  let dir = process.cwd();
  while (!existsSync(path.join(dir, "turbo.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("brand: turbo.json not found above " + process.cwd());
    dir = parent;
  }
  root = dir;
  return dir;
}

/** An editor link that opens the file at the line. */
export function editorHref(rel: string, line = 1, column = 1): string {
  return `vscode://file${path.join(repoRoot(), rel)}:${line}:${column}`;
}
