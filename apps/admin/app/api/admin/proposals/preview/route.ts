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

    const company = await getCompanySettings();
    const pptxBuffer = await buildProposalPptx(content, company);
    const images = await renderPptxToPngs(pptxBuffer);

    if (!images) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Preview needs LibreOffice and poppler on the server. The proposal itself can still be generated.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      slides: images.map((buffer) => `data:image/png;base64,${buffer.toString("base64")}`),
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
