import { NextResponse } from "next/server";

import { prisma } from "@repo/database";

import {
  GithubApiError,
  GithubAuthError,
  GithubTokenMissingError,
  githubImportMode,
  githubRepoSlug,
  listRepositories,
} from "@/lib/github";
import { withAdmin } from "@/lib/with-admin";

/**
 * Repositories an operator can attach to a product (§26).
 *
 * Read-only, and only ever a convenience: a repository URL can still be typed
 * by hand, including one this token has never seen. The listing exists so that
 * the common case — a repository Altruvex owns — is a click instead of a
 * paste-and-hope, and so a typo cannot silently produce a product no webhook
 * will ever match.
 *
 * Each repository is returned with the product already using it, so the UI can
 * say "taken" rather than letting an operator create the ambiguity the webhook
 * receiver then has to refuse.
 */

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => {
  const mode = githubImportMode();
  if (mode === "none") {
    return NextResponse.json({
      success: true,
      mode,
      repositories: [],
      message:
        "Set GITHUB_TOKEN to list private repositories, or GITHUB_ACCOUNT to list a public account's. Neither is required — a repository URL can be entered by hand.",
    });
  }

  try {
    const [repositories, products] = await Promise.all([
      listRepositories(),
      prisma.product.findMany({
        where: { repositoryUrl: { not: null } },
        select: { id: true, name: true, repositoryUrl: true },
      }),
    ]);

    const takenBy = new Map<string, { id: string; name: string }>();
    for (const product of products) {
      const slug = githubRepoSlug(product.repositoryUrl);
      // First writer wins in the map, but a repository claimed twice is a
      // problem the ingest receiver already refuses — this only has to name one
      // of them so the operator knows to look.
      if (slug && !takenBy.has(slug)) takenBy.set(slug, { id: product.id, name: product.name });
    }

    return NextResponse.json({
      success: true,
      mode,
      repositories: repositories.map((repo) => ({
        ...repo,
        takenBy: takenBy.get(repo.fullName.toLowerCase()) ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof GithubTokenMissingError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 503 });
    }
    if (error instanceof GithubAuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 502 });
    }
    if (error instanceof GithubApiError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 502 });
    }
    throw error;
  }
});
