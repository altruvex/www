import { KeyRound } from "lucide-react";
import Link from "next/link";

import { AuthNotice, AuthShell } from "@/app/login/auth-shell";

import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;

  return (
    <AuthShell
      label="Operating system"
      icon={<KeyRound />}
      title="Set your password"
      lead={valid ? "Choose the password you will sign in with. This link works once." : undefined}
      footer={
        <Link
          href="/login"
          className="inline-flex min-h-8 items-center underline underline-offset-2 hover:text-foreground pointer-coarse:min-h-11"
        >
          Back to sign in
        </Link>
      }
    >
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-3">
          <AuthNotice tone="warning">
            {error === "INVALID_TOKEN"
              ? "This link has been used already or has expired."
              : "This page needs the link from your invitation or reset email."}
          </AuthNotice>
          <p className="text-base text-muted-foreground">
            Ask an owner to send a new one from the Team screen — links expire after 24 hours.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
