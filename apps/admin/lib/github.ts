import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { BuildInput, DeploymentInput, EnvironmentInput } from "@/lib/ingest-writers";

/**
 * GitHub → engineering telemetry (§7, §26).
 *
 * GitHub already knows when a workflow ran and when a deployment went out. The
 * webhook is that knowledge arriving in GitHub's vocabulary; everything here is
 * translation into ours, and nothing here invents a fact GitHub did not send.
 *
 * The translation is deliberately pure and kept out of the route handler so the
 * mapping can be asserted directly — the parts that are easy to get quietly
 * wrong (which conclusion counts as a failure, which environment a branch
 * belongs to) are decisions, not plumbing.
 */

export const GITHUB_EVENT_HEADER = "x-github-event";
export const GITHUB_DELIVERY_HEADER = "x-github-delivery";
export const GITHUB_SIGNATURE_HEADER = "x-hub-signature-256";

/** The events this receiver acts on. Anything else is acknowledged and dropped. */
export const HANDLED_EVENTS = ["ping", "workflow_run", "deployment_status"] as const;

/**
 * Verifies GitHub's HMAC over the exact bytes received.
 *
 * Fails closed: with no secret configured there is nothing to verify against,
 * and an unverified webhook is an unauthenticated write to the one part of this
 * application whose value is that a human could not have typed it. That is the
 * opposite of the WhatsApp webhook's pre-launch tolerance, and deliberately so —
 * this endpoint has never accepted unsigned traffic, so nothing breaks by
 * refusing it.
 */
export function verifyGithubSignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (!header?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = header.slice("sha256=".length);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length || expectedBuf.length === 0) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Reduces any way a GitHub repository can be written down to `owner/repo`,
 * lowercased.
 *
 * A product's `repositoryUrl` is typed by a human and arrives as an HTTPS URL,
 * an SSH remote, or with a `.git` suffix and a trailing slash. All of those name
 * the same repository, and the webhook must match on identity rather than on
 * whichever spelling was pasted into the form.
 *
 * Returns null for anything that is not a GitHub repository, so a product
 * pointed at GitLab or a bare hostname simply never matches.
 */
export function githubRepoSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // owner/repo, already bare.
  const bare = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(trimmed);
  if (bare && !trimmed.includes(":") && !trimmed.includes("github.com")) {
    return `${bare[1]}/${bare[2]}`.toLowerCase();
  }

  const ssh = /^(?:ssh:\/\/)?git@github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(trimmed);
  if (ssh) return `${ssh[1]}/${ssh[2]}`.toLowerCase();

  const https = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:[?#].*)?$/.exec(
    trimmed,
  );
  if (https) return `${https[1]}/${https[2]}`.toLowerCase();

  return null;
}

/* -------------------------------------------------------------------------- */
/* workflow_run → Build                                                       */
/* -------------------------------------------------------------------------- */

const repositorySchema = z.object({
  full_name: z.string().min(1),
  default_branch: z.string().optional(),
});

export const workflowRunSchema = z.object({
  action: z.string(),
  repository: repositorySchema,
  sender: z.object({ login: z.string() }).optional(),
  workflow_run: z.object({
    id: z.number(),
    name: z.string().nullish(),
    head_branch: z.string().nullish(),
    head_sha: z.string().nullish(),
    status: z.string().nullish(),
    conclusion: z.string().nullish(),
    run_started_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    actor: z.object({ login: z.string() }).nullish(),
    head_commit: z.object({ message: z.string().nullish() }).nullish(),
  }),
});

export type WorkflowRunPayload = z.infer<typeof workflowRunSchema>;

/**
 * A workflow conclusion is not a build status, and the difference matters.
 *
 * `cancelled`, `skipped`, `stale` and `neutral` are all "this build did not
 * produce a verdict" — reporting them as FAILED would put a red row on a
 * product page for something nobody broke. Anything else that is not `success`
 * is a genuine failure, including the ones GitHub names separately
 * (`timed_out`, `startup_failure`), because the effect on the product is the
 * same: nothing shipped.
 */
export function buildStatusFromWorkflowRun(
  status: string | null | undefined,
  conclusion: string | null | undefined,
): BuildInput["status"] {
  if (status !== "completed") {
    return status === "in_progress" ? "RUNNING" : "QUEUED";
  }
  if (conclusion === "success") return "SUCCEEDED";
  if (
    conclusion === "cancelled" ||
    conclusion === "skipped" ||
    conclusion === "stale" ||
    conclusion === "neutral"
  ) {
    return "CANCELLED";
  }
  return "FAILED";
}

/**
 * A workflow run carries no environment, so one is inferred from the branch:
 * the repository's default branch is production, everything else is a preview.
 *
 * This is a stated convention rather than a fact GitHub sent. It is the reading
 * that keeps a pull-request build off the production timeline — the alternative,
 * defaulting everything to PRODUCTION, would file every experiment on a branch
 * as a production build.
 */
export function environmentFromBranch(
  branch: string | null | undefined,
  defaultBranch: string | null | undefined,
): EnvironmentInput {
  if (!branch || !defaultBranch) return "PREVIEW";
  return branch === defaultBranch ? "PRODUCTION" : "PREVIEW";
}

const firstLine = (value: string | null | undefined, max: number): string | undefined => {
  if (!value) return undefined;
  const line = value.split("\n")[0]?.trim();
  return line ? line.slice(0, max) : undefined;
};

export function buildFromWorkflowRun(payload: WorkflowRunPayload): BuildInput {
  const run = payload.workflow_run;
  const status = buildStatusFromWorkflowRun(run.status, run.conclusion);
  const completed = run.status === "completed";

  // The workflow name rides in `triggeredBy` because a repository with a test
  // workflow and a deploy workflow produces two builds per push, and an
  // operator needs to see which of them is the one that went red.
  const who = run.actor?.login ?? payload.sender?.login;
  const triggeredBy = [who, run.name].filter(Boolean).join(" · ").slice(0, 200) || undefined;

  return {
    externalId: `gh-run-${run.id}`,
    status,
    environment: environmentFromBranch(run.head_branch, payload.repository.default_branch),
    commitSha: run.head_sha ?? undefined,
    commitMessage: firstLine(run.head_commit?.message, 500),
    branch: run.head_branch ?? undefined,
    triggeredBy,
    startedAt: run.run_started_at ? new Date(run.run_started_at) : undefined,
    finishedAt: completed && run.updated_at ? new Date(run.updated_at) : undefined,
    // GitHub reports a conclusion, never a cause. Quoting the conclusion is the
    // whole of what it told us; the cause is in the run's own logs.
    failureReason:
      status === "FAILED"
        ? `Workflow ${run.name ? `"${run.name}" ` : ""}concluded ${run.conclusion ?? "without success"}`.slice(
            0,
            1000,
          )
        : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* deployment_status → Deployment                                             */
/* -------------------------------------------------------------------------- */

export const deploymentStatusSchema = z.object({
  action: z.string(),
  repository: repositorySchema,
  sender: z.object({ login: z.string() }).optional(),
  deployment: z.object({
    id: z.number(),
    sha: z.string().nullish(),
    ref: z.string().nullish(),
    environment: z.string().nullish(),
    creator: z.object({ login: z.string() }).nullish(),
    created_at: z.string().nullish(),
  }),
  deployment_status: z.object({
    state: z.string(),
    description: z.string().nullish(),
    environment: z.string().nullish(),
    environment_url: z.string().nullish(),
    updated_at: z.string().nullish(),
    creator: z.object({ login: z.string() }).nullish(),
  }),
});

export type DeploymentStatusPayload = z.infer<typeof deploymentStatusSchema>;

/**
 * GitHub environment names are free text — "production", "Production", "prod",
 * "staging-eu", "Preview – client-site". Matching on a substring is the only
 * reading that survives a team naming its own environments, and anything
 * unrecognised falls to PREVIEW rather than being promoted to production.
 */
export function environmentFromGithubName(name: string | null | undefined): EnvironmentInput {
  const value = (name ?? "").toLowerCase();
  if (value.includes("prod")) return "PRODUCTION";
  if (value.includes("stag") || value.includes("test") || value.includes("qa")) return "STAGING";
  return "PREVIEW";
}

/**
 * `inactive` is not a rollback. GitHub sends it when a deployment is superseded
 * by a newer one, which the newer deployment's own row already records — writing
 * ROLLED_BACK for it would put an undo on the timeline that nobody performed.
 */
export function deploymentStatusFromState(
  state: string,
): DeploymentInput["status"] | null {
  switch (state) {
    case "queued":
    case "pending":
      return "PENDING";
    case "in_progress":
      return "IN_PROGRESS";
    case "success":
      return "SUCCEEDED";
    case "failure":
    case "error":
      return "FAILED";
    default:
      return null;
  }
}

export function deploymentFromStatusEvent(
  payload: DeploymentStatusPayload,
): DeploymentInput | null {
  const state = payload.deployment_status.state;
  const status = deploymentStatusFromState(state);
  if (!status) return null;

  const environmentName =
    payload.deployment_status.environment ?? payload.deployment.environment ?? null;
  const url = payload.deployment_status.environment_url?.trim();

  const who =
    payload.deployment_status.creator?.login ??
    payload.deployment.creator?.login ??
    payload.sender?.login;

  return {
    externalId: `gh-deployment-${payload.deployment.id}`,
    status,
    environment: environmentFromGithubName(environmentName),
    commitSha: payload.deployment.sha ?? undefined,
    // Only an absolute URL is a place a person can click. GitHub allows the
    // field to be empty, and a relative or malformed value is worth less than
    // leaving the product's recorded URL as it was.
    url: url && /^https?:\/\//.test(url) ? url.slice(0, 500) : undefined,
    triggeredBy: who ? `${who} · GitHub`.slice(0, 200) : undefined,
    startedAt: payload.deployment.created_at
      ? new Date(payload.deployment.created_at)
      : undefined,
    finishedAt:
      (status === "SUCCEEDED" || status === "FAILED") && payload.deployment_status.updated_at
        ? new Date(payload.deployment_status.updated_at)
        : undefined,
    failureReason:
      status === "FAILED"
        ? (firstLine(payload.deployment_status.description, 1000) ??
          `GitHub reported the deployment as ${state}`)
        : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Reading repositories, so a product can be imported rather than typed        */
/* -------------------------------------------------------------------------- */

const GITHUB_API = "https://api.github.com";

/**
 * How a repository is offered to an operator creating a product.
 *
 * Deliberately not GitHub's whole payload: only the fields that answer "is this
 * the right repository" or that pre-fill something on the product. Everything
 * else would be data this application stores without a reason to.
 */
export interface RepositoryOption {
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  /** The repo's own homepage field, which is usually the live site. */
  homepage: string | null;
  isPrivate: boolean;
  language: string | null;
  defaultBranch: string;
  pushedAt: string | null;
  archived: boolean;
}

/** A token that is expired, revoked, or lacks the scope to see repositories. */
export class GithubAuthError extends Error {
  constructor(readonly status: number) {
    super(
      status === 401
        ? "GitHub rejected GITHUB_TOKEN. It is expired, revoked, or mistyped."
        : "GITHUB_TOKEN lacks the access needed to list repositories, or the rate limit is exhausted.",
    );
    this.name = "GithubAuthError";
  }
}

export class GithubApiError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`GitHub returned ${status}: ${detail}`);
    this.name = "GithubApiError";
  }
}

export class GithubTokenMissingError extends Error {
  constructor() {
    super(
      "Neither GITHUB_TOKEN nor GITHUB_ACCOUNT is set, so no repositories can be listed.",
    );
    this.name = "GithubTokenMissingError";
  }
}

export function githubImportMode(): "token" | "public" | "none" {
  if (process.env.GITHUB_TOKEN) return "token";
  if (process.env.GITHUB_ACCOUNT) return "public";
  return "none";
}

interface ApiRepository {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  private: boolean;
  language: string | null;
  default_branch: string;
  pushed_at: string | null;
  archived: boolean;
}

const toOption = (repo: ApiRepository): RepositoryOption => ({
  fullName: repo.full_name,
  name: repo.name,
  description: repo.description,
  htmlUrl: repo.html_url,
  homepage: repo.homepage?.trim() ? repo.homepage.trim() : null,
  isPrivate: repo.private,
  language: repo.language,
  defaultBranch: repo.default_branch,
  pushedAt: repo.pushed_at,
  archived: repo.archived,
});

/**
 * Lists repositories an operator can attach to a product.
 *
 * Two modes, and the difference is visible rather than hidden:
 *
 * - With `GITHUB_TOKEN`, `/user/repos` returns everything that token can see,
 *   private repositories included. This is the normal case for Altruvex's own
 *   work.
 * - With only `GITHUB_ACCOUNT`, the public repositories of that account are
 *   listed unauthenticated. That is the open-source case — a client's public
 *   repository, or one nobody holds a token for.
 *
 * Neither is required. A product can always be given a repository URL by hand,
 * including one belonging to somebody else entirely, and this listing exists to
 * save typing rather than to be the only way in.
 */
export async function listRepositories(): Promise<RepositoryOption[]> {
  const mode = githubImportMode();
  if (mode === "none") throw new GithubTokenMissingError();

  const token = process.env.GITHUB_TOKEN;
  const account = process.env.GITHUB_ACCOUNT;

  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    // GitHub rejects an API request with no user agent.
    "user-agent": "altruvex-os",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const repositories: RepositoryOption[] = [];
  // Two pages of 100. A studio does not have three hundred repositories, and an
  // unbounded loop against somebody else's rate limit is a way to be locked out
  // by one mistyped account name.
  for (let page = 1; page <= 2; page++) {
    const path =
      mode === "token"
        ? `/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member&page=${page}`
        : `/users/${encodeURIComponent(account!)}/repos?per_page=100&sort=pushed&page=${page}`;

    const response = await fetch(`${GITHUB_API}${path}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (response.status === 401 || response.status === 403) {
        throw new GithubAuthError(response.status);
      }
      throw new GithubApiError(response.status, detail.slice(0, 300));
    }

    const page_ = (await response.json()) as ApiRepository[];
    repositories.push(...page_.map(toOption));
    if (page_.length < 100) break;
  }

  // Archived repositories last rather than hidden: an operator does sometimes
  // attach one, and silently omitting it looks like the listing is broken.
  return repositories.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "");
  });
}

/* -------------------------------------------------------------------------- */
/* Detecting the framework a repository is built with                         */
/* -------------------------------------------------------------------------- */

/**
 * GitHub reports a *language*, not a framework, and the two are not the same
 * fact. "TypeScript" is true of a Next.js site, an Express API and a CLI, and
 * writing it into a field labelled Framework would put a wrong answer on the
 * product page that reads like a right one.
 *
 * So the manifest is read instead — the file the project itself declares its
 * dependencies in. When nothing recognisable is there, the answer is null and
 * the operator types it. A blank field is honest; a guess is not.
 */

/** Manifests worth opening, in the order they are looked for. */
const MANIFESTS = [
  "package.json",
  "composer.json",
  "pyproject.toml",
  "requirements.txt",
  "Gemfile",
  "go.mod",
  "pubspec.yaml",
] as const;

type Manifest = (typeof MANIFESTS)[number];

/**
 * Ordered because a meta-framework always depends on the library underneath it.
 * A Next.js project has `react` in its dependencies, so `next` has to be tested
 * first or every Next.js site is reported as React.
 */
const JS_FRAMEWORKS: { dependency: string; label: string }[] = [
  { dependency: "next", label: "Next.js" },
  { dependency: "nuxt", label: "Nuxt" },
  { dependency: "@remix-run/react", label: "Remix" },
  { dependency: "@sveltejs/kit", label: "SvelteKit" },
  { dependency: "astro", label: "Astro" },
  { dependency: "gatsby", label: "Gatsby" },
  { dependency: "@angular/core", label: "Angular" },
  { dependency: "@nestjs/core", label: "NestJS" },
  { dependency: "expo", label: "Expo" },
  { dependency: "react-native", label: "React Native" },
  { dependency: "express", label: "Express" },
  { dependency: "fastify", label: "Fastify" },
  { dependency: "vue", label: "Vue" },
  { dependency: "svelte", label: "Svelte" },
  { dependency: "react", label: "React" },
  { dependency: "vite", label: "Vite" },
];

const NO_GUESS: FrameworkGuess = { framework: null, evidence: null, confidence: "none" };

/** `^16.2.10`, `~4.0.0-beta.1`, `>=18` → `16`, `4`, `18`. */
export function majorVersion(range: string | undefined): string | null {
  if (!range) return null;
  const match = /(\d+)\.?/.exec(range.replace(/^[^0-9]*/, ""));
  return match?.[1] ?? null;
}

/** Build tools, not frameworks. A Laravel app ships Vite; it is not a Vite app. */
const LOW_CONFIDENCE = new Set(["Vite"]);

export interface FrameworkGuess {
  framework: string | null;
  /** Which file the answer came from, so a wrong one can be traced. */
  evidence: string | null;
  /**
   * Whether the signal actually identifies a framework.
   *
   * `vite` in a package.json and a bare `go.mod` say how something is built,
   * not what it is — a Laravel project ships Vite for its assets, and
   * answering "Vite" there is a confident wrong answer, which is worse than
   * none. Low-confidence guesses are only used when no manifest offers a real
   * one.
   */
  confidence: "high" | "low" | "none";
}

/**
 * Reads one manifest's text and names the framework it declares.
 *
 * Pure, so the mapping can be asserted without a network: the ordering rules
 * above are the part that goes quietly wrong.
 */
export function frameworkFromManifest(file: Manifest, content: string): FrameworkGuess {
  const evidence = file;

  if (file === "package.json") {
    let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      pkg = JSON.parse(content) as typeof pkg;
    } catch {
      return NO_GUESS;
    }
    const deps = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
    for (const { dependency, label } of JS_FRAMEWORKS) {
      const range = deps[dependency];
      if (!range) continue;
      const major = majorVersion(range);
      return {
        framework: major ? `${label} ${major}` : label,
        evidence,
        confidence: LOW_CONFIDENCE.has(label) ? "low" : "high",
      };
    }
    return NO_GUESS;
  }

  const lower = content.toLowerCase();

  const high = (framework: string): FrameworkGuess => ({ framework, evidence, confidence: "high" });

  if (file === "composer.json") {
    if (lower.includes("laravel/framework")) return high("Laravel");
    if (lower.includes("symfony/")) return high("Symfony");
    return NO_GUESS;
  }

  if (file === "pyproject.toml" || file === "requirements.txt") {
    if (lower.includes("django")) return high("Django");
    if (lower.includes("fastapi")) return high("FastAPI");
    if (lower.includes("flask")) return high("Flask");
    return NO_GUESS;
  }

  if (file === "Gemfile") {
    if (lower.includes("rails")) return high("Ruby on Rails");
    return NO_GUESS;
  }

  if (file === "go.mod") {
    if (lower.includes("github.com/gin-gonic/gin")) return high("Gin");
    if (lower.includes("github.com/labstack/echo")) return high("Echo");
    // The language, not a framework: only worth saying when nothing else does.
    return { framework: "Go", evidence, confidence: "low" };
  }

  if (file === "pubspec.yaml") {
    if (lower.includes("flutter")) return high("Flutter");
    return NO_GUESS;
  }

  return NO_GUESS;
}

interface ContentsEntry {
  name: string;
  type: string;
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "altruvex-os",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Reads a repository and names what it is built with.
 *
 * Three rules, each of them a bug this had before it had them:
 *
 * 1. **Every manifest present is read, not the first one.** `laravel/laravel`
 *    carries both a `composer.json` that says Laravel and a `package.json` that
 *    carries Vite for its assets. Stopping at the first match answered "Vite",
 *    which is confidently wrong — worse than the blank field it replaced.
 * 2. **A build tool never beats a framework.** Vite and a bare `go.mod` are
 *    low-confidence and only used when nothing else answers.
 * 3. **A workspace root is not the project.** A monorepo's root `package.json`
 *    lists `turbo` and `prettier` and no framework at all, so when one declares
 *    `workspaces` the apps underneath it are read instead. Without this, every
 *    repository Altruvex actually owns returned no answer.
 */
async function readManifest(
  fullName: string,
  path: string,
  headers: Record<string, string>,
): Promise<string | null> {
  const response = await fetch(`${GITHUB_API}/repos/${fullName}/contents/${path}`, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { content?: string; encoding?: string };
  if (payload.encoding !== "base64" || !payload.content) return null;
  return Buffer.from(payload.content, "base64").toString("utf8");
}

async function listDirectory(
  fullName: string,
  path: string,
  headers: Record<string, string>,
): Promise<ContentsEntry[]> {
  const response = await fetch(`${GITHUB_API}/repos/${fullName}/contents/${path}`, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GithubAuthError(response.status);
    }
    return [];
  }
  const entries = (await response.json()) as ContentsEntry[];
  return Array.isArray(entries) ? entries : [];
}

/** Directories a monorepo keeps its applications in, in the order tried. */
const WORKSPACE_DIRECTORIES = ["apps", "packages", "src"] as const;

export async function detectFramework(fullName: string): Promise<FrameworkGuess> {
  const headers = apiHeaders();

  const rootEntries = await listDirectory(fullName, "", headers);
  const rootFiles = new Set(rootEntries.filter((e) => e.type === "file").map((e) => e.name));
  const present = MANIFESTS.filter((file) => rootFiles.has(file));
  if (present.length === 0) return NO_GUESS;

  const guesses: FrameworkGuess[] = [];
  let rootPackageJson: string | null = null;

  // Bounded: three manifests is already more than any real repository has, and
  // an unbounded read is a way to spend a rate limit on a form field.
  for (const file of present.slice(0, 3)) {
    const content = await readManifest(fullName, file, headers);
    if (content === null) continue;
    if (file === "package.json") rootPackageJson = content;
    guesses.push(frameworkFromManifest(file, content));
  }

  const best = (list: FrameworkGuess[]) =>
    list.find((g) => g.confidence === "high") ??
    list.find((g) => g.confidence === "low") ??
    null;

  const rootBest = best(guesses);
  if (rootBest?.confidence === "high") return rootBest;

  // A workspace root describes the repository, not the thing it builds.
  if (rootPackageJson && declaresWorkspaces(rootPackageJson)) {
    const nested = await detectInWorkspaces(fullName, rootEntries, headers);
    if (nested?.confidence === "high") return nested;
    if (nested && !rootBest) return nested;
  }

  return rootBest ?? NO_GUESS;
}

function declaresWorkspaces(packageJson: string): boolean {
  try {
    const parsed = JSON.parse(packageJson) as { workspaces?: unknown };
    return parsed.workspaces !== undefined;
  } catch {
    return false;
  }
}

async function detectInWorkspaces(
  fullName: string,
  rootEntries: ContentsEntry[],
  headers: Record<string, string>,
): Promise<FrameworkGuess | null> {
  const rootDirs = new Set(rootEntries.filter((e) => e.type === "dir").map((e) => e.name));

  for (const directory of WORKSPACE_DIRECTORIES) {
    if (!rootDirs.has(directory)) continue;
    const children = await listDirectory(fullName, directory, headers);
    const packages = children.filter((e) => e.type === "dir").slice(0, 4);

    let fallback: FrameworkGuess | null = null;
    for (const pkg of packages) {
      const path = `${directory}/${pkg.name}/package.json`;
      const content = await readManifest(fullName, path, headers);
      if (content === null) continue;
      const guess = frameworkFromManifest("package.json", content);
      // The evidence has to name the file that answered, or a wrong answer in a
      // ten-package monorepo is untraceable.
      const located = { ...guess, evidence: guess.framework ? path : null };
      if (located.confidence === "high") return located;
      if (located.confidence === "low" && !fallback) fallback = located;
    }
    if (fallback) return fallback;
  }

  return null;
}
