import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().optional(),
  ADMIN_SECRET: z.string().optional(),
  ADMIN_SECRET_PEPPER: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().optional(),
  // Shared by every repository whose webhook points here. GitHub verifies with
  // an HMAC over the raw body, so this is the whole of the receiver's
  // authenticity check — without it the endpoint refuses every delivery.
  GITHUB_WEBHOOK_SECRET: z.string().min(16).optional(),
  // Listing repositories so a product can be imported rather than typed. Both
  // optional and neither is required: a repository URL can always be entered by
  // hand, including one no token here can see. GITHUB_TOKEN lists everything
  // that token can reach, private repositories included; GITHUB_ACCOUNT lists
  // one account's public repositories with no credential at all.
  GITHUB_TOKEN: z.string().optional(),
  // Mail. Two transports, and which one is used is decided by which of these
  // exist — Resend sends from a verified domain, SMTP from whatever mailbox the
  // credentials belong to. Neither is required; with neither, nothing pretends
  // to send.
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Where a client's reply lands. Mail is sent from a dedicated sending
  // subdomain for deliverability, and nobody reads that mailbox — without this,
  // a reply to a proposal goes nowhere and nobody finds out.
  EMAIL_REPLY_TO: z.string().optional(),
  GITHUB_ACCOUNT: z.string().optional(),
  // Slack, outbound only. One incoming-webhook URL is the entire integration:
  // no app, no bot token, no per-user grant.
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  // The admin app's own address. Only used to make Slack messages clickable —
  // without it they still send, just without links.
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  // Wiring the admin app to the public site's cache. Both optional: without
  // them a price change still saves and still reaches the site, just on the
  // public cache's own timer rather than immediately.
  PUBLIC_SITE_URL: z.string().url().optional(),
  PRICING_REVALIDATE_SECRET: z.string().min(16).optional(),
});

/**
 * An unset variable and one set to nothing are the same thing.
 *
 * `.env` files carry blank entries on purpose — they are how this codebase
 * writes down a capability that is off. But zod sees `""` as a present value:
 * `SMTP_PORT=` coerces to `0` and fails `.positive()`, and any blank `.url()`
 * field fails validation outright. Both would take the whole schema down over a
 * variable nobody is using.
 *
 * Stripping them here fixes the class rather than the instance, so a future
 * optional field cannot reintroduce it.
 */
const withoutBlanks = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ""),
);

const parsed = envSchema.safeParse(withoutBlanks);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  // `next build` evaluates this module (imported for its side effect from
  // the root layout) while collecting page data for every route, including
  // ones that never touch auth. Runtime secrets like BETTER_AUTH_SECRET are
  // often only present in the deploy's runtime environment, not the build
  // environment, so only hard-fail once the app is actually serving traffic.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
    throw new Error("Invalid environment variables. Check server logs.");
  }
}

export const env = parsed.data;
