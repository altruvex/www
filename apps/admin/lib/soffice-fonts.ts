import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

// Headless LibreOffice draws text through fontconfig, and the fontconfig it
// bundles on macOS lists only LibreOffice's own fonts: a deck that names
// "Altruvex Sans" (or even Georgia) silently renders in Linux Libertine. This
// writes a config that adds the brand's desktop builds straight from the
// package (packages/brand-font/dist/desktop, so nothing has to be installed)
// and the operating system's font folders. On Linux the system config is
// included first, so whatever the host already resolves still resolves.
// A folder that does not exist is skipped by fontconfig, not an error.
const BRAND_FONTS = path.join(process.cwd(), "node_modules/@repo/brand-font/dist/desktop");
const CACHE_DIR = path.join(tmpdir(), "altruvex-fontconfig-cache");

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Writes fonts.conf into `workDir` and returns the env to run soffice with. */
export async function sofficeFontEnv(workDir: string): Promise<NodeJS.ProcessEnv> {
  const dirs = [
    BRAND_FONTS,
    "~/Library/Fonts",
    "/Library/Fonts",
    "/System/Library/Fonts",
    "/System/Library/Fonts/Supplemental",
  ];
  const conf = [
    '<?xml version="1.0"?>',
    '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">',
    "<fontconfig>",
    '  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>',
    ...dirs.map((dir) => `  <dir>${escapeXml(dir)}</dir>`),
    `  <cachedir>${escapeXml(CACHE_DIR)}</cachedir>`,
    "</fontconfig>",
    "",
  ].join("\n");
  const file = path.join(workDir, "fonts.conf");
  await writeFile(file, conf);
  return { ...process.env, FONTCONFIG_FILE: file };
}
