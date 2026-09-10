import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * Load environment variables:
 * - If DATABASE_URL is already in process.env (e.g. Vercel, CI), keep it.
 * - If NODE_ENV or APP_ENV is 'production', load .env.production (or .env.production.local).
 * - Otherwise (default/local), load .env.local.
 */
// If production is explicitly requested, ensure .env.production overrides any preloaded local env
const isProd =
  process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";

if (isProd) {
  const prodPath = path.resolve(process.cwd(), ".env.production");
  if (fs.existsSync(prodPath)) {
    dotenv.config({ path: prodPath, override: true });
  }
} else if (!process.env.DATABASE_URL) {
  const localPath = path.resolve(process.cwd(), ".env.local");
  const fallbackPath = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(localPath)) {
    dotenv.config({ path: localPath });
  } else if (fs.existsSync(fallbackPath)) {
    dotenv.config({ path: fallbackPath });
  }
}

/**
 * Prisma 7 moved CLI configuration out of `schema.prisma` and stopped loading
 * `.env` automatically, so both live here. The datasource URL is read from
 * `DATABASE_URL`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
