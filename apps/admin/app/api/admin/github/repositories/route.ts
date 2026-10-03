import {
  GithubApiError,
  GithubAuthError,
  GithubTokenMissingError,
  githubImportMode,
  githubRepoSlug,
  listRepositories,
} from "@/lib/github";
import { withAdmin } from "@/lib/with-admin";
import { prisma } from "@repo/database";
import { NextResponse } from "next/server";



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
}, { can: ["edit", "project"] });
