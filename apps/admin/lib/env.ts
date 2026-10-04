import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().optional(),
  ADMIN_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(16).optional(),
  GITHUB_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  GITHUB_ACCOUNT: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  AWS_ENDPOINT_URL_S3: z.string().url().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),
  STORAGE_PRIVATE: z.enum(["true", "false"]).optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  R2_PRIVATE: z.enum(["true", "false"]).optional(),
  PUBLIC_SITE_URL: z.string().url().optional(),
  PRICING_REVALIDATE_SECRET: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  ADMIN_MFA_REQUIRED: z.enum(["true", "false"]).optional(),
});

const withoutBlanks = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ""),
);

const parsed = envSchema.safeParse(withoutBlanks);

const servingInProduction =
  process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD;

if (servingInProduction && !process.env.BETTER_AUTH_URL?.trim()) {
  throw new Error(
    "BETTER_AUTH_URL must be set in production. Client-facing links are built on it and must never come from the request host.",
  );
}

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  if (servingInProduction) {
    throw new Error("Invalid environment variables. Check server logs.");
  }
}

export const env = parsed.data;
