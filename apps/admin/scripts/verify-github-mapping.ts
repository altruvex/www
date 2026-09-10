/**
 * The GitHub → Altruvex translation, checked without a database.
 *
 * Everything asserted here is a decision rather than plumbing: which repository
 * spellings name the same repository, which workflow conclusions count as a
 * failure, which branch is production, and which GitHub states must write
 * nothing at all. Those are the parts that would go wrong quietly — a mapping
 * that files every pull-request build as a production build still renders
 * perfectly.
 *
 *   cd apps/admin && bun run verify:github
 *
 * The webhook route itself — signature rejection, product matching, the refusal
 * to guess between two products sharing a repository — is exercised against a
 * real database by `verify:engineering`.
 */
import { createHmac } from "node:crypto";
import {
  buildFromWorkflowRun,
  frameworkFromManifest,
  githubImportMode,
  majorVersion,
  buildStatusFromWorkflowRun,
  deploymentFromStatusEvent,
  environmentFromBranch,
  environmentFromGithubName,
  githubRepoSlug,
  verifyGithubSignature,
} from "@/lib/github";

let fail = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) fail++;
};

console.log("Repository identity");
for (const spelling of [
  "https://github.com/Altruvex/site",
  "https://github.com/altruvex/site.git",
  "http://www.github.com/altruvex/site/",
  "git@github.com:altruvex/site.git",
  "ssh://git@github.com/altruvex/site",
  "altruvex/site",
  "github.com/altruvex/site",
]) {
  check(githubRepoSlug(spelling) === "altruvex/site", `${spelling} → altruvex/site`);
}
check(githubRepoSlug("https://gitlab.com/altruvex/site") === null, "a GitLab URL never matches");
check(githubRepoSlug(null) === null, "an unset repository URL never matches");
check(githubRepoSlug("") === null, "an empty repository URL never matches");

console.log("\nSignature");
const secret = "a-secret-long-enough";
const body = JSON.stringify({ hello: "world" });
const sig = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
check(verifyGithubSignature(body, sig, secret), "a correct signature verifies");
check(!verifyGithubSignature(body, sig, undefined), "no configured secret fails closed");
check(!verifyGithubSignature(body, null, secret), "a missing header is refused");
check(!verifyGithubSignature(body, "sha256=deadbeef", secret), "a short digest is refused");
check(!verifyGithubSignature(body + " ", sig, secret), "a tampered body is refused");

console.log("\nWorkflow conclusions");
check(buildStatusFromWorkflowRun("queued", null) === "QUEUED", "queued → QUEUED");
check(buildStatusFromWorkflowRun("in_progress", null) === "RUNNING", "in_progress → RUNNING");
check(buildStatusFromWorkflowRun("completed", "success") === "SUCCEEDED", "success → SUCCEEDED");
check(buildStatusFromWorkflowRun("completed", "timed_out") === "FAILED", "timed_out → FAILED");
check(buildStatusFromWorkflowRun("completed", "startup_failure") === "FAILED", "startup_failure → FAILED");
check(buildStatusFromWorkflowRun("completed", "cancelled") === "CANCELLED", "cancelled → CANCELLED");
check(buildStatusFromWorkflowRun("completed", "skipped") === "CANCELLED", "skipped → CANCELLED");

console.log("\nEnvironment inference");
check(environmentFromBranch("main", "main") === "PRODUCTION", "default branch → PRODUCTION");
check(environmentFromBranch("feature/x", "main") === "PREVIEW", "any other branch → PREVIEW");
check(environmentFromBranch(null, "main") === "PREVIEW", "an unknown branch is never production");
check(environmentFromGithubName("Production") === "PRODUCTION", "\"Production\" → PRODUCTION");
check(environmentFromGithubName("prod-eu") === "PRODUCTION", "\"prod-eu\" → PRODUCTION");
check(environmentFromGithubName("staging-2") === "STAGING", "\"staging-2\" → STAGING");
check(environmentFromGithubName("pr-42") === "PREVIEW", "an unrecognised name is never production");
check(environmentFromGithubName(null) === "PREVIEW", "a missing name is never production");

console.log("\nworkflow_run → build");
const build = buildFromWorkflowRun({
  action: "completed",
  repository: { full_name: "altruvex/site", default_branch: "main" },
  sender: { login: "ali" },
  workflow_run: {
    id: 42,
    name: "Deploy",
    head_branch: "main",
    head_sha: "9f2c1ab",
    status: "completed",
    conclusion: "failure",
    run_started_at: "2026-09-07T12:00:00Z",
    updated_at: "2026-09-07T12:03:20Z",
    actor: { login: "ali" },
    head_commit: { message: "Fix the checkout currency field\n\nlong body here" },
  },
});
check(build.externalId === "gh-run-42", "the run id is the idempotency key");
check(build.status === "FAILED", "the conclusion became the status");
check(build.environment === "PRODUCTION", "a default-branch run is a production build");
check(build.commitMessage === "Fix the checkout currency field", "only the commit subject is kept");
check(build.triggeredBy === "ali · Deploy", "the workflow name rides with the actor");
check(build.failureReason?.includes("failure") === true, "the reason quotes the conclusion");
check(build.finishedAt?.toISOString() === "2026-09-07T12:03:20.000Z", "the finish time is GitHub's");

console.log("\ndeployment_status → deployment");
const base = {
  action: "created",
  repository: { full_name: "altruvex/site", default_branch: "main" },
  sender: { login: "ali" },
  deployment: {
    id: 91,
    sha: "9f2c1ab",
    ref: "main",
    environment: "production",
    creator: { login: "ali" },
    created_at: "2026-09-07T12:04:00Z",
  },
};
const deployed = deploymentFromStatusEvent({
  ...base,
  deployment_status: {
    state: "success",
    description: "ok",
    environment: "production",
    environment_url: "https://client-site.com",
    updated_at: "2026-09-07T12:05:00Z",
    creator: { login: "ali" },
  },
});
check(deployed?.externalId === "gh-deployment-91", "the deployment id is the idempotency key");
check(deployed?.status === "SUCCEEDED", "success → SUCCEEDED");
check(deployed?.url === "https://client-site.com", "the environment URL is the live address");

const relative = deploymentFromStatusEvent({
  ...base,
  deployment_status: {
    state: "success",
    description: null,
    environment: "production",
    environment_url: "/not-absolute",
    updated_at: "2026-09-07T12:05:00Z",
    creator: null,
  },
});
check(relative?.url === undefined, "a non-absolute environment URL is dropped, not stored");

const inactive = deploymentFromStatusEvent({
  ...base,
  deployment_status: {
    state: "inactive",
    description: null,
    environment: "production",
    environment_url: null,
    updated_at: "2026-09-07T12:06:00Z",
    creator: null,
  },
});
check(inactive === null, "inactive writes nothing — being superseded is not a rollback");

const errored = deploymentFromStatusEvent({
  ...base,
  deployment_status: {
    state: "error",
    description: "Build step exited 1\nstack trace follows",
    environment: "production",
    environment_url: null,
    updated_at: "2026-09-07T12:06:00Z",
    creator: null,
  },
});
check(errored?.status === "FAILED", "error → FAILED");
check(errored?.failureReason === "Build step exited 1", "GitHub's own description is the reason");

console.log("\nRepository import mode");
{
  const saved = { token: process.env.GITHUB_TOKEN, account: process.env.GITHUB_ACCOUNT };
  try {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_ACCOUNT;
    check(
      githubImportMode() === "none",
      "with neither variable set there is nothing to list — the URL field is the only way in",
    );

    process.env.GITHUB_ACCOUNT = "altruvex";
    check(
      githubImportMode() === "public",
      "an account name alone lists public repositories, with no credential",
    );

    process.env.GITHUB_TOKEN = "ghp_example";
    check(
      githubImportMode() === "token",
      "a token wins over an account name — it can see strictly more",
    );
  } finally {
    if (saved.token) process.env.GITHUB_TOKEN = saved.token;
    else delete process.env.GITHUB_TOKEN;
    if (saved.account) process.env.GITHUB_ACCOUNT = saved.account;
    else delete process.env.GITHUB_ACCOUNT;
  }
}

console.log("\nImport matching");
{
  // The listing marks a repository as taken by comparing normalised slugs, so
  // the same repository written two different ways on two products must still
  // collide. This is the check that stops the UI from cheerfully offering a
  // repository the webhook receiver will then refuse to attribute.
  const onProductA = githubRepoSlug("git@github.com:Altruvex/site.git");
  const fromGithub = githubRepoSlug("https://github.com/altruvex/site");
  check(
    onProductA === fromGithub && onProductA !== null,
    "a repository typed as an SSH remote matches the same one listed by GitHub",
  );
  check(
    githubRepoSlug("https://github.com/altruvex/site-two") !== fromGithub,
    "a repository whose name merely starts the same does not collide",
  );
}

console.log("\nFramework detection");
{
  const pkg = (deps: Record<string, string>, dev: Record<string, string> = {}) =>
    JSON.stringify({ dependencies: deps, devDependencies: dev });

  // The ordering rule. Every meta-framework depends on the library beneath it,
  // so a wrong order reports every Next.js site in the studio as "React" — a
  // plausible-looking answer nobody would think to question.
  check(
    frameworkFromManifest("package.json", pkg({ next: "^16.2.10", react: "19.0.0" })).framework ===
      "Next.js 16",
    "a Next.js project is Next.js, not the React it depends on",
  );
  check(
    frameworkFromManifest("package.json", pkg({ nuxt: "^3.14.0", vue: "^3.5.0" })).framework ===
      "Nuxt 3",
    "a Nuxt project is Nuxt, not Vue",
  );
  check(
    frameworkFromManifest("package.json", pkg({ gatsby: "5.0.0", react: "18.0.0" })).framework ===
      "Gatsby 5",
    "a Gatsby project is Gatsby, not React",
  );
  check(
    frameworkFromManifest("package.json", pkg({ react: "^19.0.0" }, { vite: "^6.0.0" }))
      .framework === "React 19",
    "a plain React app is React, and devDependencies are read too",
  );
  check(
    frameworkFromManifest("package.json", pkg({ "@sveltejs/kit": "^2.0.0", svelte: "5.0.0" }))
      .framework === "SvelteKit 2",
    "SvelteKit beats Svelte",
  );

  check(
    frameworkFromManifest("package.json", pkg({ "some-cli": "1.0.0" })).framework === null,
    "an unrecognised project has no answer rather than a guess",
  );
  check(
    frameworkFromManifest("package.json", "{ not json").framework === null,
    "an unparseable manifest yields null, not a crash",
  );
  check(
    frameworkFromManifest("package.json", pkg({ next: "*" })).framework === "Next.js",
    "a dependency with no readable version still names the framework",
  );

  check(
    frameworkFromManifest("composer.json", '{"require":{"laravel/framework":"^11.0"}}')
      .framework === "Laravel",
    "composer.json is read for PHP",
  );
  check(
    frameworkFromManifest("requirements.txt", "Django==5.1\npsycopg2").framework === "Django",
    "requirements.txt is read for Python",
  );
  check(
    frameworkFromManifest("Gemfile", 'gem "rails", "~> 8.0"').framework === "Ruby on Rails",
    "a Gemfile is read for Ruby",
  );
  check(
    frameworkFromManifest("package.json", pkg({ next: "^16.0.0" })).evidence === "package.json",
    "the answer says which file it came from",
  );
  check(
    frameworkFromManifest("package.json", pkg({ unknown: "1" })).evidence === null,
    "and cites nothing when it found nothing",
  );

  // A build tool is not a framework. `laravel/laravel` ships Vite for its
  // assets and a composer.json that says Laravel; reading only the first
  // manifest answered "Vite", which is a confidently wrong answer and worse
  // than the blank field it replaced.
  check(
    frameworkFromManifest("package.json", pkg({}, { vite: "^8.0.0" })).confidence === "low",
    "Vite is a low-confidence signal, never allowed to win on its own",
  );
  check(
    frameworkFromManifest("composer.json", '{"require":{"laravel/framework":"^11.0"}}')
      .confidence === "high",
    "Laravel is high-confidence, so it beats the Vite in the same repository",
  );
  check(
    frameworkFromManifest("go.mod", "module example.com/x\n\ngo 1.23").confidence === "low",
    "a bare go.mod names a language, not a framework",
  );
  check(
    frameworkFromManifest("go.mod", "require github.com/gin-gonic/gin v1.10.0").confidence ===
      "high",
    "a Go module with a web framework in it is high-confidence",
  );
  check(
    frameworkFromManifest("package.json", pkg({ next: "^16.0.0" })).confidence === "high",
    "a real framework is always high-confidence",
  );
  check(
    frameworkFromManifest("package.json", "{ bad").confidence === "none",
    "no answer is its own confidence, distinct from a weak one",
  );

  check(majorVersion("^16.2.10") === "16", "a caret range reads as its major");
  check(majorVersion("~4.0.0-beta.1") === "4", "a prerelease range reads as its major");
  check(majorVersion(">=18") === "18", "a bare minimum reads as its major");
  check(majorVersion("*") === null, "a wildcard has no major");
  check(majorVersion(undefined) === null, "a missing range has no major");
}

console.log(fail === 0 ? "\ngithub — all checks passed.\n" : `\n${fail} check(s) FAILED.\n`);
process.exit(fail === 0 ? 0 : 1);
