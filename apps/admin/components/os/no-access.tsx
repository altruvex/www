import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@repo/ui";

import type { Role } from "@/lib/nav";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Capability } from "@/lib/rbac";

export function NoAccess({
  title = "Not in your role",
  what,
  grantedTo,
  role,
  required,
}: {
  title?: string;
  what?: string;
  grantedTo: Role[];
  role?: Role;
  required?: Capability[];
}) {
  const subject = required?.[0]?.[1];
  const describe = what ?? (subject ? `${subject} records` : "this page");

  return (
    <div className="plane mx-auto my-8 max-w-md space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground">
          <LockKeyhole className="size-4" aria-hidden />
        </span>
        <div>
          <h1 className="text-base font-medium text-foreground">{title}</h1>
          <p className="text-meta text-muted-foreground">
            {role ? `${ROLE_LABELS[role]} does not cover ${describe}.` : `Your role does not cover ${describe}.`}
          </p>
        </div>
      </div>

      {role && <p className="text-meta text-subtle-foreground">{ROLE_DESCRIPTIONS[role]}</p>}

      {grantedTo.length > 0 && (
        <dl className="space-y-1 text-meta">
          <dt className="telemetry text-subtle-foreground">Who sees it</dt>
          <dd className="flex flex-wrap gap-1">
            {grantedTo.map((r) => (
              <span
                key={r}
                className="inline-flex items-center rounded-sm border border-border bg-surface px-1.5 py-0.5 text-foreground"
                title={ROLE_DESCRIPTIONS[r]}
              >
                {ROLE_LABELS[r]}
              </span>
            ))}
          </dd>
        </dl>
      )}

      <p className="text-meta text-muted-foreground">
        An owner changes roles from the Team page. Nothing was logged against you for opening this.
      </p>

      <Button asChild variant="secondary" size="sm">
        <Link href="/">
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to Today
        </Link>
      </Button>
    </div>
  );
}
