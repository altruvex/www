import { z } from "zod";

const envSchema = z.object({
  ADMIN_SECRET: z.string().min(1),
  ADMIN_SECRET_PEPPER: z.string().min(1).optional().default("default-pepper"),
  DATABASE_URL: z.string().url(),
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
