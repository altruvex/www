import { prisma } from "@repo/database";

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
  const [waTotal, waFailed, waLast] = await Promise.all([
    prisma.whatsAppMessage.count(),
    prisma.whatsAppMessage.count({ where: { status: "FAILED" } }),
    prisma.whatsAppMessage.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, direction: true },
    }),
  ]);
  const failureRate = waTotal ? waFailed / waTotal : 0;
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
          ? `${waFailed} of ${waTotal} messages failed`
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
      { label: "Failed", value: String(waFailed) },
      {
        label: "Last message",
        value: waLast ? `${waLast.direction.toLowerCase()} · ${waLast.createdAt.toISOString().slice(0, 16).replace("T", " ")}` : "never",
      },
      { label: "API version", value: process.env.WHATSAPP_API_VERSION || "v21.0 (default)" },
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
  checks.push({
    id: "email",
    name: "Transactional email",
    category: "integration",
    state: "unconfigured",
    summary: "No mail transport is wired up",
    impact:
      "Nothing is emailed: no proposal delivery by mail, no internal notifications, no invoice sends. WhatsApp carries all of it today.",
    remedy:
      "Add SMTP credentials (Nodemailer) or a transactional provider, then enable the Email module.",
    lastChecked: at,
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
