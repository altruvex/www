import { GithubAuthError, detectFramework, githubImportMode } from "@/lib/github";
import { withAdmin } from "@/lib/with-admin";
import { NextResponse } from "next/server";
import { z } from "zod";


export const dynamic = "force-dynamic";

const querySchema = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "Expected owner/repo."),
});

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const { repo } = querySchema.parse({ repo: searchParams.get("repo") ?? "" });

  if (githubImportMode() === "none") {
    return NextResponse.json(
      { success: false, message: "No GitHub credentials are configured." },
      { status: 503 },
    );
  }

  try {
    const guess = await detectFramework(repo);
    return NextResponse.json({ success: true, ...guess });
  } catch (error) {
    if (error instanceof GithubAuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 502 });
    }
    console.error(`Framework detection failed for ${repo}`, error);
    return NextResponse.json({ success: true, framework: null, evidence: null });
  }
}, { can: ["edit", "project"] });
