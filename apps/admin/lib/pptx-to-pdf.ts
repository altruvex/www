import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Renders a pptx buffer to PDF via a local LibreOffice install. Returns null
 * (instead of throwing) when the binary isn't available or conversion fails
 * — pdfUrl is a nice-to-have preview, not something the proposal flow should
 * ever hard-fail on. Most hosting platforms (e.g. Vercel) don't ship
 * LibreOffice by default; this only works where it's installed.
 */
export async function convertPptxToPdf(pptxBuffer: Buffer): Promise<Buffer | null> {
  let workDir: string | null = null;
  try {
    workDir = await mkdtemp(path.join(tmpdir(), "altruvex-pptx-"));
    const pptxPath = path.join(workDir, "input.pptx");
    await writeFile(pptxPath, pptxBuffer);

    await execFileAsync(
      "soffice",
      ["--headless", "--convert-to", "pdf", "--outdir", workDir, pptxPath],
      { timeout: 60_000 },
    );

    return await readFile(path.join(workDir, "input.pdf"));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("PDF conversion skipped (LibreOffice unavailable or failed):", error);
    }
    return null;
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
