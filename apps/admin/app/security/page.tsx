import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { TwoFactorSetup } from "@/components/security/two-factor-setup";
import { MFA_SKIP_DAYS, mfaRequired } from "@/lib/mfa";
import { skipTwoFactor } from "./actions";
import { requireAdminPage } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

/**
 * Enrolment sits outside the (dashboard) group on purpose: the dashboard
 * layout is what redirects an un-enrolled operator here, and a screen inside
 * that layout would redirect to itself.
 */
export default async function SecurityPage() {
  const session = await requireAdminPage();
  const enabled = Boolean((session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled);
  const required = mfaRequired();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-95">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-foreground font-sans text-meta font-semibold text-background">
            A
          </span>
          <span className="font-sans text-md font-semibold tracking-tight">Altruvex</span>
          <span className="telemetry ms-auto text-subtle-foreground">Security</span>
        </div>
        <div className="plane p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Two-factor authentication</h1>
          </div>
          <p className="mt-1 mb-5 text-base text-muted-foreground">
            {session.user.email}
          </p>
          <TwoFactorSetup enabled={enabled} required={required} />
        </div>
        {!required && !enabled && (
          <form action={skipTwoFactor} className="mt-4 flex items-baseline justify-between gap-3">
            <p className="text-meta text-muted-foreground">
              Optional. Skipping asks again in {MFA_SKIP_DAYS} days, or turn it on any time from
              Settings.
            </p>
            <button
              type="submit"
              className="shrink-0 text-meta font-medium text-foreground underline underline-offset-2"
            >
              Skip for now
            </button>
          </form>
        )}
        {!required && enabled && (
          <p className="mt-4 text-meta text-muted-foreground">
            <Link href="/" className="underline underline-offset-2">
              Back to the dashboard
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
