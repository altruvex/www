import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { BuildInput, DeploymentInput, EnvironmentInput } from "@/lib/ingest-writers";

export const GITHUB_EVENT_HEADER = "x-github-event";
export const GITHUB_DELIVERY_HEADER = "x-github-delivery";
export const GITHUB_SIGNATURE_HEADER = "x-hub-signature-256";

const ACKNOWLEDGE_ONLY_EVENTS = new Set([
  "ping",
  "installation",
  "installation_repositories",
  "installation_target",
  "github_app_authorization",
]);

export function isAcknowledgeOnlyEvent(event: string): boolean {
  return ACKNOWLEDGE_ONLY_EVENTS.has(event);
}

export function isGithubAppDelivery(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const installation = (payload as { installation?: unknown }).installation;
  return (
    typeof installation === "object" &&
    installation !== null &&
    typeof (installation as { id?: unknown }).id === "number"
  );
}

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

export function githubRepoSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

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
    failureReason:
      status === "FAILED"
        ? `Workflow ${run.name ? `"${run.name}" ` : ""}concluded ${run.conclusion ?? "without success"}`.slice(
            0,
            1000,
          )
        : undefined,
  };
}

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

export function environmentFromGithubName(name: string | null | undefined): EnvironmentInput {
  const value = (name ?? "").toLowerCase();
  if (value.includes("prod")) return "PRODUCTION";
  if (value.includes("stag") || value.includes("test") || value.includes("qa")) return "STAGING";
  return "PREVIEW";
}

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

const GITHUB_API = "https://api.github.com";

export interface RepositoryOption {
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  isPrivate: boolean;
  language: string | null;
  defaultBranch: string;
  pushedAt: string | null;
  archived: boolean;
}

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

export async function listRepositories(): Promise<RepositoryOption[]> {
  const mode = githubImportMode();
  if (mode === "none") throw new GithubTokenMissingError();

  const token = process.env.GITHUB_TOKEN;
  const account = process.env.GITHUB_ACCOUNT;

  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "altruvex-os",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const repositories: RepositoryOption[] = [];
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

  return repositories.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "");
  });
}

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

export function majorVersion(range: string | undefined): string | null {
  if (!range) return null;
  const match = /(\d+)\.?/.exec(range.replace(/^[^0-9]*/, ""));
  return match?.[1] ?? null;
}

const LOW_CONFIDENCE = new Set(["Vite"]);

export interface FrameworkGuess {
  framework: string | null;
  evidence: string | null;
  confidence: "high" | "low" | "none";
}

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

const WORKSPACE_DIRECTORIES = ["apps", "packages", "src"] as const;

export async function detectFramework(fullName: string): Promise<FrameworkGuess> {
  const headers = apiHeaders();

  const rootEntries = await listDirectory(fullName, "", headers);
  const rootFiles = new Set(rootEntries.filter((e) => e.type === "file").map((e) => e.name));
  const present = MANIFESTS.filter((file) => rootFiles.has(file));
  if (present.length === 0) return NO_GUESS;

  const guesses: FrameworkGuess[] = [];
  let rootPackageJson: string | null = null;

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
      const located = { ...guess, evidence: guess.framework ? path : null };
      if (located.confidence === "high") return located;
      if (located.confidence === "low" && !fallback) fallback = located;
    }
    if (fallback) return fallback;
  }

  return null;
}
