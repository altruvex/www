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

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables. Check server logs.");
  }
}

export const env = parsed.data;
