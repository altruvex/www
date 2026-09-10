import { NextResponse } from "next/server";
import { z } from "zod";

import { GithubAuthError, detectFramework, githubImportMode } from "@/lib/github";
import { withAdmin } from "@/lib/with-admin";

/**
 * What a repository is built with, read from the repository (§26).
 *
 * Called when an operator picks a repository, never while the list is drawn:
 * it costs two GitHub requests, and doing it per row would turn a hundred
 * repositories into two hundred calls against a rate limit for an answer nobody
 * asked for yet.
 *
 * Answers `null` freely. A repository with no manifest, or one built with
 * something this does not recognise, has no answer — and a blank field the
 * operator fills in is worth more than a confident guess they have to notice is
 * wrong.
 */

export const dynamic = "force-dynamic";

const querySchema = z.object({
  // owner/repo, the shape GitHub itself uses. Anything else is not a
  // repository this can open.
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
    // Detection is a convenience. A failure here must not stop a product being
    // created, so it reads as "no answer" rather than as an error.
    console.error(`Framework detection failed for ${repo}`, error);
    return NextResponse.json({ success: true, framework: null, evidence: null });
  }
});
