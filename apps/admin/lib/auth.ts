import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "@repo/database";

import { recordActivity } from "@/lib/activity-log";

export const auth = betterAuth({
  appName: "Altruvex",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // No cookie cache. It traded one database read per request for a window —
    // five minutes, as it was configured — in which a deleted account or a
    // demoted role still carried its old permissions, while `lib/deletable.ts`
    // tells the operator "their sessions end immediately". At this scale the
    // read is cheaper than the sentence being untrue.
  },
  /**
   * Better Auth limits sign-in attempts on its own, but its default store is
   * process memory: every serverless instance counts separately, so the real
   * ceiling is however many instances the platform starts. The table makes the
   * count shared, and the custom rules tighten the endpoints where a guess is
   * worth something.
   */
  rateLimit: {
    storage: "database",
    modelName: "authRateLimit",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
      "/two-factor/enable": { window: 60, max: 5 },
      "/two-factor/disable": { window: 60, max: 5 },
    },
  },
  plugins: [
    // TOTP + backup codes. The admin app holds every client, contract and
    // payment record behind one password; this is the second factor.
    twoFactor({ issuer: "Altruvex" }),
  ],
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // `/audit` is where "who touched this" is answered, and until now it
          // could not answer "who signed in", which the login screen claims is
          // recorded. Written through the same helper as every other event, so
          // a failure here cannot break the sign-in it describes.
          const user = await prisma.user
            .findUnique({
              where: { id: session.userId },
              select: { id: true, name: true, email: true },
            })
            .catch(() => null);

          await recordActivity({
            action: "auth.signed_in",
            actor: {
              kind: "USER",
              id: session.userId,
              label: user?.name || user?.email || session.userId,
            },
            entityType: "user",
            entityId: session.userId,
            entityLabel: user?.name || user?.email || null,
            summary: `Signed in${session.ipAddress ? ` from ${session.ipAddress}` : ""}`,
            metadata: { userAgent: session.userAgent ?? null },
          });

          await prisma.user
            .update({ where: { id: session.userId }, data: { lastLoginAt: new Date() } })
            .catch(() => null);
        },
      },
    },
  },
});
