import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moved CLI configuration out of `schema.prisma` and stopped loading
 * `.env` automatically, so both live here. The datasource URL is read the same
 * way it always was — from `DATABASE_URL`, never inlined.
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
