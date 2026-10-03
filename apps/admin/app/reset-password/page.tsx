import Link from "next/link";
import { KeyRound } from "lucide-react";

import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

/**
 * Where the set-password link lands. Better Auth verifies the token in the
 * mailed URL and redirects here with `?token=` when it is good or
 * `?error=INVALID_TOKEN` when it is spent or expired; the form then posts the
 * new password with that token. It is reached by someone with no session, so
 * it must be a public path in `proxy.ts`. The token is never logged here and
 * never leaves the form except in the request that consumes it.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-95">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-foreground font-sans text-meta font-semibold text-background">
            A
          </span>
          <span className="font-sans text-md font-semibold tracking-tight">Altruvex</span>
          <span className="telemetry ms-auto text-subtle-foreground">Operating system</span>
        </div>
        <div className="plane p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Set your password</h1>
          </div>
          {valid ? (
            <>
              <p className="mt-1 mb-5 text-base text-muted-foreground">
                Choose the password you will sign in with. This link works once.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <>
              <p className="mt-1 text-base text-muted-foreground">
                {error === "INVALID_TOKEN"
                  ? "This link has been used already or has expired."
                  : "This page needs the link from your invitation or reset email."}
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                Ask an owner to send a new one from the Team screen — links expire after 24 hours.
              </p>
            </>
          )}
        </div>
        <p className="mt-3 text-meta text-subtle-foreground">
          <Link href="/login" className="underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
