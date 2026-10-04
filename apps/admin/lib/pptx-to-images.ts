import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";

import { sofficeFontEnv } from "./soffice-fonts";

const execFileAsync = promisify(execFile);

export type RenderFailure =
  | "unavailable"
  | "timeout"
  | "failed";

export type RenderResult =
  | { ok: true; images: Buffer[] }
  | { ok: false; reason: RenderFailure; detail: string };

export async function renderPptxToPngs(
  pptxBuffer: Buffer,
  options: { dpi?: number; firstPage?: number; lastPage?: number } = {},
): Promise<RenderResult> {
  const { dpi = 110, firstPage, lastPage } = options;
  let workDir: string | null = null;

  try {
    workDir = await mkdtemp(path.join(tmpdir(), "altruvex-preview-"));
    const pptxPath = path.join(workDir, "deck.pptx");
    const profileDir = path.join(workDir, "lo-profile");
    await writeFile(pptxPath, pptxBuffer);

    try {
      await execFileAsync(
        "soffice",
        [
          `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
          "--headless",
          "--convert-to",
          "pdf",
          "--outdir",
          workDir,
          pptxPath,
        ],
        { timeout: 60_000, env: await sofficeFontEnv(workDir) },
      );
    } catch (error) {
      return { ok: false, ...classify(error, "soffice") };
    }

    const pageArgs: string[] = [];
    if (firstPage) pageArgs.push("-f", String(firstPage));
    if (lastPage) pageArgs.push("-l", String(lastPage));

    try {
      await execFileAsync(
        "pdftoppm",
        [
          "-png",
          "-r",
          String(dpi),
          ...pageArgs,
          path.join(workDir, "deck.pdf"),
          path.join(workDir, "slide"),
        ],
        { timeout: 30_000 },
      );
    } catch (error) {
      return { ok: false, ...classify(error, "pdftoppm") };
    }

    const files = (await readdir(/*turbopackIgnore: true*/ workDir))
      .filter((name) => name.startsWith("slide-") && name.endsWith(".png"))
      .sort((a, b) => pageNumber(a) - pageNumber(b));

    if (files.length === 0) {
      return {
        ok: false,
        reason: "failed",
        detail: "The converter ran but produced no pages.",
      };
    }

    const images = await Promise.all(
      files.map((name) => readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ workDir!, name))),
    );
    return { ok: true, images };
  } catch (error) {
    return { ok: false, ...classify(error, "render") };
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function classify(
  error: unknown,
  step: string,
): { reason: RenderFailure; detail: string } {
  const err = error as NodeJS.ErrnoException & {
    killed?: boolean;
    signal?: string;
  };
  if (err?.code === "ENOENT") {
    return {
      reason: "unavailable",
      detail: `${step} is not installed on this host.`,
    };
  }
  if (err?.killed || err?.signal === "SIGTERM") {
    return { reason: "timeout", detail: `${step} ran out of time.` };
  }
  return {
    reason: "failed",
    detail: `${step} failed: ${err?.message ?? "unknown error"}`,
  };
}

function pageNumber(fileName: string): number {
  const match = /slide-(\d+)\.png$/.exec(fileName);
  return match ? Number(match[1]) : 0;
}
