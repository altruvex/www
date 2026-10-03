"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";

import { setMemberRole } from "@/app/(dashboard)/_actions/team";
import type { Role } from "@/lib/nav";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";

/**
 * Changes one member's product role. The server applies the rules (only an
 * owner, never your own, never the last owner); this control only shows the
 * refusal it gets back and resets to the stored value.
 */
export function RoleSelect({
  userId,
  role,
  allowOwner,
}: {
  userId: string;
  role: Role | undefined;
  /** Whether the viewer may grant Owner — only an Owner can. */
  allowOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const current = role ?? "";

  function change(next: string) {
    if (next === current) return;
    startTransition(async () => {
      const result = await setMemberRole(userId, next);
      if (result.ok) toast.success(result.message ?? "Role changed.");
      else toast.error(result.message);
      router.refresh();
    });
  }

  return (
    <Select value={current} onValueChange={change} disabled={pending}>
      <SelectTrigger className="w-32" aria-label="Role" aria-busy={pending}>
        <SelectValue placeholder="No role" />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((option) => (
          <SelectItem key={option} value={option} disabled={option === "OWNER" && !allowOwner}>
            {ROLE_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
