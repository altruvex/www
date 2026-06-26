import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_CLARITY_ID: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.1.0"),
  DATABASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.format();
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(errors, null, 2),
  );

  const shouldThrow =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.CI === "true";

  if (shouldThrow) {
    const missingFields = Object.keys(errors)
      .filter((k) => k !== "_errors")
      .join(", ");
    throw new Error(
      `Invalid environment variables: ${missingFields}. Check Vercel project settings.`,
    );
  }
}
