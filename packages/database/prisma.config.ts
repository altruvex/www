import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

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

const migrationUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL must be set for the Prisma CLI.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
