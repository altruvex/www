import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().optional(),
  ADMIN_SECRET: z.string().optional(),
  ADMIN_SECRET_PEPPER: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
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
