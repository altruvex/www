import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";

import { sofficeFontEnv } from "./soffice-fonts";

const execFileAsync = promisify(execFile);

export async function convertPptxToPdf(pptxBuffer: Buffer): Promise<Buffer | null> {
  let workDir: string | null = null;
  try {
    workDir = await mkdtemp(path.join(tmpdir(), "altruvex-pptx-"));
    const pptxPath = path.join(workDir, "input.pptx");
    await writeFile(pptxPath, pptxBuffer);

    await execFileAsync(
      "soffice",
      [
        `-env:UserInstallation=${pathToFileURL(path.join(workDir, "lo-profile")).href}`,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        workDir,
        pptxPath,
      ],
      { timeout: 60_000, env: await sofficeFontEnv(workDir) },
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
