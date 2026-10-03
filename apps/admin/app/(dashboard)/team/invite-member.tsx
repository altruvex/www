"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { Button, Field, Input, LoadingIcon } from "@repo/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui";

import { inviteMember } from "@/app/(dashboard)/_actions/team";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, isRole } from "@/lib/rbac";

/**
 * Adds a person and mails them a set-password link. There is no sign-up, so
 * this is the only way in. Without a mail transport the link cannot be sent,
 * and the button says so instead of creating an account nobody can enter.
 */
export function InviteMember({
  transportConfigured,
  allowOwner,
}: {
  transportConfigured: boolean;
  allowOwner: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("VIEWER");
  const [pending, startTransition] = React.useTransition();

  if (!transportConfigured) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled>
          <UserPlus className="size-3.5" />
          Invite
        </Button>
        <Link href="/integrations" className="text-meta text-muted-foreground underline underline-offset-2">
          Integration required — no mail transport
        </Link>
      </div>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await inviteMember({ name, email, role });
      if (result.ok) {
        toast.success(result.message ?? "Invitation sent.");
        setOpen(false);
        setName("");
        setEmail("");
        setRole("VIEWER");
      } else {
        toast.error(result.message);
      }
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="brand">
          <UserPlus className="size-3.5" />
          Invite
        </Button>
      </SheetTrigger>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <form onSubmit={submit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Invite someone</SheetTitle>
            <SheetDescription>
              They receive a link to set their password; it works once and expires in 24 hours. The
              role decides what they may do once in.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                maxLength={80}
                required
                autoFocus
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Role" hint={isRole(role) ? ROLE_DESCRIPTIONS[role] : undefined}>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger aria-label="Role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((option) => (
                    <SelectItem key={option} value={option} disabled={option === "OWNER" && !allowOwner}>
                      {ROLE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending && <LoadingIcon size="sm" />}
              {pending ? "Sending…" : "Send invitation"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
