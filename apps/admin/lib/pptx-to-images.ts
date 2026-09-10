import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";

const execFileAsync = promisify(execFile);

export type RenderFailure =
  /** soffice or pdftoppm is not on PATH. The host cannot preview at all. */
  | "unavailable"
  /** The toolchain was there and ran out of time. */
  | "timeout"
  /** It ran, and produced nothing usable. */
  | "failed";

export type RenderResult =
  | { ok: true; images: Buffer[] }
  | { ok: false; reason: RenderFailure; detail: string };

/**
 * Renders a pptx to one PNG per slide (LibreOffice -> PDF -> PNG).
 *
 * Every invocation gets its OWN LibreOffice user profile. This is not a
 * detail: two `soffice` processes sharing the default profile do not queue —
 * the second one exits silently, writes no file and prints nothing, so the
 * caller sees "no output" and cannot tell it apart from a missing binary.
 * That happens whenever a preview and a generate overlap, and every time the
 * operator has the LibreOffice desktop app open on the same machine.
 *
 * Failures are typed rather than collapsed into null, because "LibreOffice is
 * not installed" and "the render timed out" need different sentences on
 * screen — telling someone to install software they already have is worse
 * than saying nothing.
 */
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
        { timeout: 60_000 },
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

    // pdftoppm numbers pages without zero padding past 9, so sort on the
    // parsed page number instead of lexically.
    const files = (await readdir(workDir))
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
      files.map((name) => readFile(path.join(workDir!, name))),
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
