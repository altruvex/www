import { ShieldCheck } from "lucide-react";

import { Skeleton } from "@repo/ui";

import { AuthShell } from "@/app/login/auth-shell";

export default function Loading() {
  return (
    <AuthShell label="Security" icon={<ShieldCheck />} title="Two-factor authentication">
      <div className="space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[var(--control-h-lg)] w-full" />
        <Skeleton className="h-[var(--control-h-lg)] w-full" />
      </div>
    </AuthShell>
  );
}
