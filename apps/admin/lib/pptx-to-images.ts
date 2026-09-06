import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Renders a pptx to one PNG per slide (LibreOffice -> PDF -> PNG). Used by
 * the Admin preview and by the QA gate's render step.
 *
 * Returns null rather than throwing when the toolchain isn't installed —
 * same posture as convertPptxToPdf: previews are a convenience, and a host
 * without LibreOffice should still be able to generate the deck itself.
 */
export async function renderPptxToPngs(
  pptxBuffer: Buffer,
  dpi = 110,
): Promise<Buffer[] | null> {
  let workDir: string | null = null;
  try {
    workDir = await mkdtemp(path.join(tmpdir(), "altruvex-preview-"));
    const pptxPath = path.join(workDir, "deck.pptx");
    await writeFile(pptxPath, pptxBuffer);

    await execFileAsync(
      "soffice",
      ["--headless", "--convert-to", "pdf", "--outdir", workDir, pptxPath],
      { timeout: 120_000 },
    );

    await execFileAsync(
      "pdftoppm",
      ["-png", "-r", String(dpi), path.join(workDir, "deck.pdf"), path.join(workDir, "slide")],
      { timeout: 120_000 },
    );

    // pdftoppm numbers pages without zero padding past 9, so sort on the
    // parsed page number instead of lexically.
    const files = (await readdir(workDir))
      .filter((name) => name.startsWith("slide-") && name.endsWith(".png"))
      .sort((a, b) => pageNumber(a) - pageNumber(b));

    if (files.length === 0) return null;
    return await Promise.all(files.map((name) => readFile(path.join(workDir!, name))));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Slide render skipped (LibreOffice/poppler unavailable):", error);
    }
    return null;
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function pageNumber(fileName: string): number {
  const match = /slide-(\d+)\.png$/.exec(fileName);
  return match ? Number(match[1]) : 0;
}
