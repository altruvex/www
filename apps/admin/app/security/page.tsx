import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@repo/ui";

import { AuthShell } from "@/app/login/auth-shell";
import { TwoFactorSetup } from "@/components/security/two-factor-setup";
import { MFA_SKIP_DAYS, mfaRequired } from "@/lib/mfa";
import { requireAdminPage } from "@/lib/require-admin";

import { skipTwoFactor } from "./actions";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await requireAdminPage();
  const enabled = Boolean((session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled);
  const required = mfaRequired();

  return (
    <AuthShell
      label="Security"
      icon={<ShieldCheck />}
      title="Two-factor authentication"
      lead={session.user.email}
      footer={
        !required && !enabled ? (
          <form action={skipTwoFactor} className="flex items-center justify-between gap-3">
            <p className="text-meta text-muted-foreground">
              Optional. Skipping asks again in {MFA_SKIP_DAYS} days, or turn it on any time from
              Settings.
            </p>
            <Button type="submit" variant="ghost" size="sm" className="shrink-0">
              Skip for now
            </Button>
          </form>
        ) : !required && enabled ? (
          <Link
            href="/"
            className="inline-flex min-h-8 items-center underline underline-offset-2 hover:text-foreground pointer-coarse:min-h-11"
          >
            Back to the dashboard
          </Link>
        ) : undefined
      }
    >
      <TwoFactorSetup enabled={enabled} required={required} />
    </AuthShell>
  );
}
