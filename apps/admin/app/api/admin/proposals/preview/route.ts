import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { buildProposalPptx } from "@/lib/proposal-builder";
import { renderPptxToPngs } from "@/lib/pptx-to-images";
import { getCompanySettings } from "@/lib/company-settings";
import { ProposalQaError, runProposalContentGate } from "@/lib/proposal-qa";

/**
 * Renders unsaved form state to slide images so the admin can see the deck
 * before committing to a generate. Nothing is persisted here.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession(request))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    let content;
    try {
      // Same gate as a real generate — a preview that accepts invalid input
      // would teach the admin the wrong thing about what will pass.
      content = runProposalContentGate(body?.content);
    } catch (error) {
      if (error instanceof ProposalQaError) {
        return NextResponse.json(
          { success: false, message: error.message, issues: error.issues },
          { status: 400 },
        );
      }
      throw error;
    }

    // One slide when the caller asked for one. The conversion still walks the
    // whole deck — that part is LibreOffice's — but rasterising and shipping
    // a single page instead of seven cuts the response by roughly 7x, which
    // is most of the wait an operator actually feels.
    const requested = Number(body?.slide);
    const single =
      Number.isInteger(requested) && requested >= 1 && requested <= 20
        ? requested
        : null;

    const company = await getCompanySettings();
    const pptxBuffer = await buildProposalPptx(content, company);
    const render = await renderPptxToPngs(
      pptxBuffer,
      single ? { firstPage: single, lastPage: single } : {},
    );

    if (!render.ok) {
      // Saying "install LibreOffice" to someone whose render merely timed out
      // sends them to fix a machine that is already correct.
      const message =
        render.reason === "unavailable"
          ? "Preview needs LibreOffice and poppler on this host. The proposal itself can still be generated."
          : render.reason === "timeout"
            ? "The renderer ran out of time. Another render may have been running — try again in a moment."
            : "The renderer produced nothing. The proposal itself can still be generated.";

      return NextResponse.json(
        { success: false, reason: render.reason, message, detail: render.detail },
        { status: render.reason === "unavailable" ? 503 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      slide: single,
      slides: render.images.map(
        (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
      ),
    });
  } catch (error: unknown) {
    if (error instanceof ProposalQaError) {
      return NextResponse.json(
        { success: false, message: error.message, issues: error.issues },
        { status: 400 },
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Error rendering proposal preview:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to render preview" },
      { status: 500 },
    );
  }
}
