"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";

import { setMemberRole } from "@/app/(dashboard)/_actions/team";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import type { Role } from "@/lib/nav";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";

export function RoleSelect({
  userId,
  name,
  role,
  allowOwner,
}: {
  userId: string;
  name: string;
  role: Role | undefined;
  allowOwner: boolean;
}) {
  const router = useRouter();
  const [proposed, setProposed] = React.useState<Role | null>(null);
  const current = role ?? "";

  function propose(next: string) {
    if (next === current) return;
    setProposed(next as Role);
  }

  const nextLabel = proposed ? ROLE_LABELS[proposed] : "";
  const currentLabel = role ? ROLE_LABELS[role] : "without a role";

  return (
    <>
      <Select value={current} onValueChange={propose}>
        <SelectTrigger className="w-32" aria-label={`Role for ${name}`}>
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

      <ConfirmDialog
        open={proposed !== null}
        onOpenChange={(open) => {
          if (!open) setProposed(null);
        }}
        title={`Make ${name} ${nextLabel === "Owner" ? "an" : "a"} ${nextLabel}?`}
        body={`${name} is currently ${currentLabel}.`}
        consequence={consequenceFor(proposed, name)}
        confirmLabel={`Change to ${nextLabel}`}
        tone={proposed === "OWNER" ? "danger" : "default"}
        onConfirm={async () => {
          if (!proposed) return;
          const result = await setMemberRole(userId, proposed);
          if (result.ok) router.refresh();
          return result;
        }}
      />
    </>
  );
}

function consequenceFor(role: Role | null, name: string): string {
  switch (role) {
    case "OWNER":
      return `${name} will be able to change anyone's role, grant Owner, override delete protections and edit settings. Takes effect on their next request.`;
    case "ADMIN":
      return `${name} keeps every working screen but can no longer change roles or grant Owner. Takes effect on their next request.`;
    default:
      return `${name}'s access narrows to what this role allows, on their next request. Their account and sessions stay.`;
  }
}
