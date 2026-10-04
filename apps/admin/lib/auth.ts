import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, getIp, getSessionFromCtx, isAPIError } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "@repo/database";

import { recordActivity, systemActor } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";

const SET_PASSWORD_LINK_HOURS = 24;

export const auth = betterAuth({
  appName: "Altruvex",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    resetPasswordTokenExpiresIn: 60 * 60 * SET_PASSWORD_LINK_HOURS,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Set your password for Altruvex OS",
        text: [
          `Hello${user.name ? ` ${user.name}` : ""},`,
          "",
          "An owner has given you access to Altruvex OS. Set your password here:",
          url,
          "",
          `The link works once and expires in ${SET_PASSWORD_LINK_HOURS} hours. If you did not expect this, ignore it — nothing changes until a password is set.`,
          "",
          "Altruvex",
        ].join("\n"),
      });
    },
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
        input: false,
      },
      opsRole: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
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
    twoFactor({ issuer: "Altruvex" }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-out") return;
      const current = await getSessionFromCtx(ctx).catch(() => null);
      if (!current) return;
      await recordActivity({
        action: "auth.signed_out",
        actor: {
          kind: "USER",
          id: current.user.id,
          label: current.user.name || current.user.email,
        },
        entityType: "user",
        entityId: current.user.id,
        entityLabel: current.user.name || current.user.email,
        summary: `Signed out${current.session.ipAddress ? ` from ${current.session.ipAddress}` : ""}`,
      });
    }),
    after: createAuthMiddleware(async (ctx) => {
      const ip = ctx.request ? getIp(ctx.request, ctx.context.options) : null;

      if (ctx.path === "/sign-in/email" && isAPIError(ctx.context.returned)) {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";
        const user = email
          ? await prisma.user
              .findUnique({ where: { email }, select: { id: true, name: true, email: true } })
              .catch(() => null)
          : null;
        await recordActivity({
          action: "auth.sign_in_failed",
          actor: systemActor("Sign-in"),
          entityType: user ? "user" : "auth",
          entityId: user?.id ?? "sign-in",
          entityLabel: user ? user.name || user.email : null,
          summary: user
            ? `Refused a sign-in for ${user.name || user.email}${ip ? ` from ${ip}` : ""}`
            : `Refused a sign-in for an address that is not an account${ip ? ` from ${ip}` : ""}`,
          metadata: { code: ctx.context.returned.body?.code ?? null },
        });
        return;
      }

      if (
        (ctx.path === "/two-factor/disable" || ctx.path === "/two-factor/generate-backup-codes") &&
        !isAPIError(ctx.context.returned)
      ) {
        const current = ctx.context.session ?? (await getSessionFromCtx(ctx).catch(() => null));
        if (!current) return;
        const label = current.user.name || current.user.email;
        const disabled = ctx.path === "/two-factor/disable";
        await recordActivity({
          action: disabled ? "user.2fa_disabled" : "user.backup_codes_regenerated",
          actor: { kind: "USER", id: current.user.id, label },
          entityType: "user",
          entityId: current.user.id,
          entityLabel: label,
          summary: disabled
            ? "Turned off two-factor authentication"
            : "Replaced their two-factor backup codes",
          ...(disabled ? { before: { twoFactor: "on" }, after: { twoFactor: "off" } } : {}),
        });
      }
    }),
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
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
