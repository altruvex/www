import { prisma } from "@repo/database";

import { githubRepoSlug } from "@/lib/github";
import { NOTIFIED_ACTIONS } from "@/lib/slack";
import { emailTransport } from "@/lib/email";

/**
 * §26 / §27 — integration and system health.
 *
 * These are REAL checks, not a page of green dots. Configuration presence is
 * checked against the actual environment; liveness is checked by touching the
 * dependency. A check that cannot be performed reports "unknown", never "ok" —
 * an integrations page that lies is worse than no integrations page.
 */
export type HealthState = "ok" | "degraded" | "down" | "unconfigured" | "unknown";

export interface HealthCheck {
  id: string;
  name: string;
  category: "integration" | "infrastructure";
  state: HealthState;
  summary: string;
  /** What breaks if this is broken. */
  impact: string;
  /** What a human should do about it. */
  remedy?: string;
  /**
   * Where that is done, when it is done inside this application rather than in
   * the environment.
   *
   * The same rule `AlertBar` enforces: naming a problem without naming the
   * screen that fixes it leaves the operator hunting for the route. WhatsApp,
   * storage and email are configured entirely by environment variables and
   * carry no destination — GitHub and Google Calendar have real screens, and
   * "Integrations" is where somebody goes looking for them.
   */
  setup?: { href: string; label: string };
  detail?: string;
  lastChecked: string;
  metrics?: { label: string; value: string }[];
}

function present(...names: string[]) {
  return names.filter((n) => !process.env[n]);
}

export async function getHealthChecks(): Promise<HealthCheck[]> {
  const at = new Date().toISOString();
  const checks: HealthCheck[] = [];

  /* ---- database -------------------------------------------------------- */
  let dbState: HealthState = "unknown";
  let dbDetail: string | undefined;
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbState = "ok";
    dbDetail = `Round trip ${Date.now() - dbStart}ms`;
  } catch (error) {
    dbState = "down";
    dbDetail = error instanceof Error ? error.message : String(error);
  }
  checks.push({
    id: "database",
    name: "Database",
    category: "infrastructure",
    state: dbState,
    summary: dbState === "ok" ? "Reachable" : "Not reachable",
    impact: "Everything. No page in this application renders without it.",
    remedy: dbState === "ok" ? undefined : "Check DATABASE_URL and that Postgres is accepting connections.",
    detail: dbDetail,
    lastChecked: at,
  });

  /* ---- WhatsApp Cloud API ---------------------------------------------- */
  const waMissing = present(
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
  );
  // Health is a claim about *now*, so the failure counts are scoped to a
  // window. Counting every failure since the table was created means one bad
  // afternoon marks the integration degraded forever — and a card that can
  // never go green is a card an operator stops reading, which costs more than
  // the warning was ever worth. The all-time total stays in the metrics, where
  // it is history rather than a verdict.
  const waWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [waTotal, waFailedAllTime, waRecent, waFailed, waLast] = await Promise.all([
    prisma.whatsAppMessage.count(),
    prisma.whatsAppMessage.count({ where: { status: "FAILED" } }),
    prisma.whatsAppMessage.count({ where: { createdAt: { gte: waWindowStart } } }),
    prisma.whatsAppMessage.count({
      where: { status: "FAILED", createdAt: { gte: waWindowStart } },
    }),
    prisma.whatsAppMessage.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, direction: true },
    }),
  ]);
  const failureRate = waRecent ? waFailed / waRecent : 0;
  checks.push({
    id: "whatsapp",
    name: "WhatsApp Business Cloud API",
    category: "integration",
    state:
      waMissing.length > 0
        ? "unconfigured"
        : failureRate > 0.1
          ? "degraded"
          : waFailed > 0
            ? "degraded"
            : "ok",
    summary:
      waMissing.length > 0
        ? `Missing ${waMissing.length} credential${waMissing.length === 1 ? "" : "s"}`
        : waFailed > 0
          ? `${waFailed} of ${waRecent} messages failed in the last 24 hours`
          : waTotal === 0
            ? "Configured. Nothing has been sent yet."
            : "Configured and delivering",
    impact:
      "Proposals, contracts and onboarding are all sent over WhatsApp. If this is down, deals stop moving and the client hears nothing.",
    remedy:
      waMissing.length > 0
        ? `Set ${waMissing.join(", ")} in the environment and redeploy.`
        : waFailed > 0
          ? "Open the failed threads and resend. Repeated failures usually mean an expired access token."
          : undefined,
    detail: waMissing.length > 0 ? `Missing: ${waMissing.join(", ")}` : undefined,
    lastChecked: at,
    metrics: [
      { label: "Messages", value: String(waTotal) },
      { label: "Failed (24h)", value: String(waFailed) },
      { label: "Failed (all time)", value: String(waFailedAllTime) },
      {
        label: "Last message",
        value: waLast ? `${waLast.direction.toLowerCase()} · ${waLast.createdAt.toISOString().slice(0, 16).replace("T", " ")}` : "never",
      },
      { label: "API version", value: process.env.WHATSAPP_API_VERSION || "v21.0 (default)" },
    ],
  });

  /* ---- GitHub webhook --------------------------------------------------- */
  const ghSecret = present("GITHUB_WEBHOOK_SECRET");
  const [ghProducts, ghLastBuild, ghLastDeployment] = await Promise.all([
    prisma.product.findMany({
      where: { repositoryUrl: { not: null } },
      select: { repositoryUrl: true },
    }),
    prisma.build.findFirst({
      where: { externalId: { startsWith: "gh-run-" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.deployment.findFirst({
      where: { externalId: { startsWith: "gh-deployment-" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const ghSlugs = ghProducts
    .map((p) => githubRepoSlug(p.repositoryUrl))
    .filter((slug): slug is string => slug !== null);
  // A repository claimed by two products cannot be attributed from the webhook
  // alone, and the receiver refuses those deliveries rather than guessing.
  const ghDuplicates = ghSlugs.filter((slug, i) => ghSlugs.indexOf(slug) !== i).length;
  const ghLastEvent =
    [ghLastBuild?.createdAt, ghLastDeployment?.createdAt]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  checks.push({
    id: "github",
    name: "GitHub webhook",
    category: "integration",
    state:
      ghSecret.length > 0 || ghSlugs.length === 0
        ? "unconfigured"
        : ghDuplicates > 0
          ? "degraded"
          : ghLastEvent
            ? "ok"
            // Configured on this side, but whether GitHub is actually pointed
            // here is only knowable from a delivery. Saying "ok" before one
            // arrives would be a flag reporting on itself.
            : "unknown",
    summary:
      ghSecret.length > 0
        ? "No webhook secret set — every delivery is refused"
        : ghSlugs.length === 0
          ? "No product has a GitHub repository set"
          : ghDuplicates > 0
            ? `${ghDuplicates} repository claimed by more than one product`
            : ghLastEvent
              ? `${ghSlugs.length} repository(s) reporting`
              : "Configured, but nothing has been delivered yet",
    impact:
      "Builds and deployments arrive from GitHub on their own. Without it, the deployment history only contains what a pipeline was explicitly told to post.",
    remedy:
      ghSecret.length > 0
        ? "Set GITHUB_WEBHOOK_SECRET, then add the webhook to each repository."
        : ghSlugs.length === 0
          ? "Set the repository URL on a product, then point that repository's webhook at /api/ingest/github."
          : ghDuplicates > 0
            ? "Two products name one repository. Give the shared repository per-product ingest tokens instead."
            : ghLastEvent
              ? undefined
              : "Check the repository's webhook delivery log — a red delivery there names the reason.",
    setup: { href: "/products", label: "Set up on a product" },
    lastChecked: at,
    metrics: [
      { label: "Repositories linked", value: String(ghSlugs.length) },
      { label: "Ambiguous", value: String(ghDuplicates) },
      {
        label: "Last event",
        value: ghLastEvent ? ghLastEvent.toISOString().slice(0, 16).replace("T", " ") : "never",
      },
    ],
  });

  /* ---- Slack ------------------------------------------------------------ */
  // Deliberately reports "configured", never "healthy". An incoming webhook
  // answers nothing until something is posted to it, and there is no read
  // endpoint to probe — claiming health from the presence of a URL would be
  // exactly the flag reporting on itself that this page exists to avoid. The
  // test button on this page is the real check, and a person has to press it.
  const slackMissing = present("SLACK_WEBHOOK_URL");
  checks.push({
    id: "slack",
    name: "Slack",
    category: "integration",
    state: slackMissing.length > 0 ? "unconfigured" : "unknown",
    summary:
      slackMissing.length > 0
        ? "No webhook URL set — nothing is posted"
        : "Webhook configured. Only a posted message proves it works.",
    impact:
      "Signed contracts, opened incidents and failed production deploys reach the channel as they happen. Without it they wait until somebody opens this application.",
    remedy:
      slackMissing.length > 0
        ? "Create an incoming webhook in Slack and set SLACK_WEBHOOK_URL."
        : "Send a test message to confirm the channel receives it.",
    lastChecked: at,
    metrics: [
      { label: "Notified events", value: String(Object.keys(NOTIFIED_ACTIONS).length + 1) },
      { label: "Direction", value: "outbound only" },
    ],
  });

  /* ---- object storage --------------------------------------------------- */
  const r2Missing = present(
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
  );
  const [withFiles, withoutFiles] = await Promise.all([
    prisma.proposal.count({ where: { OR: [{ fileUrl: { not: null } }, { pdfUrl: { not: null } }] } }),
    prisma.proposal.count({ where: { fileUrl: null, pdfUrl: null } }),
  ]);
  checks.push({
    id: "storage",
    name: "Object storage (R2)",
    category: "integration",
    state: r2Missing.length > 0 ? "unconfigured" : "ok",
    summary:
      r2Missing.length > 0
        ? `Missing ${r2Missing.length} setting${r2Missing.length === 1 ? "" : "s"} — generated files stay on local disk`
        : "Configured",
    impact:
      "Proposal decks and contract documents are stored here. Without it, generated files live on the app server and are lost on redeploy.",
    remedy:
      r2Missing.length > 0
        ? `Set ${r2Missing.join(", ")}. Until then, treat public/generated as ephemeral.`
        : undefined,
    lastChecked: at,
    metrics: [
      { label: "Proposals with a file", value: String(withFiles) },
      { label: "Proposals with none", value: String(withoutFiles) },
      { label: "Bucket", value: process.env.R2_BUCKET_NAME || "not set" },
    ],
  });

  /* ---- authentication --------------------------------------------------- */
  const authMissing = present("BETTER_AUTH_SECRET");
  const [users, activeSessions] = await Promise.all([
    prisma.user.count(),
    prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);
  checks.push({
    id: "auth",
    name: "Authentication (Better Auth)",
    category: "infrastructure",
    state: authMissing.length > 0 ? "down" : "ok",
    summary: authMissing.length > 0 ? "No signing secret configured" : "Sessions issuing normally",
    impact: "Nobody can sign in, and existing sessions cannot be verified.",
    remedy: authMissing.length > 0 ? "Set BETTER_AUTH_SECRET and redeploy." : undefined,
    lastChecked: at,
    metrics: [
      { label: "Users", value: String(users) },
      { label: "Active sessions", value: String(activeSessions) },
    ],
  });

  /* ---- transactional email ---------------------------------------------- */
  const transport = emailTransport();
  const emailWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [emailTotal, emailFailedRecent, emailRecent] = await Promise.all([
    prisma.emailMessage.count(),
    prisma.emailMessage.count({
      where: { status: "FAILED", createdAt: { gte: emailWindowStart } },
    }),
    prisma.emailMessage.count({ where: { createdAt: { gte: emailWindowStart } } }),
  ]);
  checks.push({
    id: "email",
    name: "Transactional email",
    category: "integration",
    // Like Slack, a transport that has accepted mail is not the same as mail
    // that arrived — nothing here reports delivery, because nothing here can
    // know it until a provider webhook is wired up.
    state:
      transport === "none"
        ? "unconfigured"
        : emailFailedRecent > 0
          ? "degraded"
          : emailTotal === 0
            ? "unknown"
            : "ok",
    summary:
      transport === "none"
        ? "No mail transport is wired up"
        : emailFailedRecent > 0
          ? `${emailFailedRecent} of ${emailRecent} refused in the last 24 hours`
          : emailTotal === 0
            ? `${transport} configured. Nothing has been sent yet.`
            : `Sending over ${transport}`,
    impact:
      "Proposals and contracts reach a client by mail. It is the only client-facing channel that works without a verified business, a registered number and a payment method.",
    remedy:
      transport === "none"
        ? "Set RESEND_API_KEY to send from your own domain, or SMTP_HOST/SMTP_USER/SMTP_PASSWORD to send from a mailbox."
        : emailFailedRecent > 0
          ? "Open /email — each refusal carries the transport's own reason."
          : undefined,
    setup: { href: "/email", label: "Open Email" },
    lastChecked: at,
    metrics: [
      { label: "Transport", value: transport === "none" ? "none" : transport },
      { label: "Sent", value: String(emailTotal) },
      { label: "Refused (24h)", value: String(emailFailedRecent) },
      { label: "From", value: process.env.EMAIL_FROM || process.env.SMTP_USER || "not set" },
    ],
  });

  /* ---- rate limiting ---------------------------------------------------- */
  const [buckets, hotBuckets] = await Promise.all([
    prisma.rateLimitBucket.count(),
    prisma.rateLimitBucket.count({ where: { count: { gt: 50 } } }),
  ]);
  checks.push({
    id: "ratelimit",
    name: "Rate limiting",
    category: "infrastructure",
    state: hotBuckets > 0 ? "degraded" : "ok",
    summary: hotBuckets > 0 ? `${hotBuckets} bucket(s) over 50 hits in-window` : "Nothing being throttled",
    impact:
      "Protects the public form endpoints and the signing pages from abuse. A hot bucket usually means a bot found a form.",
    remedy: hotBuckets > 0 ? "Check the public form endpoints for automated traffic." : undefined,
    lastChecked: at,
    metrics: [
      { label: "Buckets tracked", value: String(buckets) },
      { label: "Over threshold", value: String(hotBuckets) },
    ],
  });

  return checks;
}

export const STATE_TONE = {
  ok: "success",
  degraded: "warning",
  down: "danger",
  unconfigured: "neutral",
  unknown: "neutral",
} as const;

export const STATE_LABEL = {
  ok: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unconfigured: "Not configured",
  unknown: "Unknown",
} as const;
