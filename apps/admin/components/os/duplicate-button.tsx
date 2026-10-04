"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { Button } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";

export function DuplicateButton({
  action,
  title,
  copies,
  skips,
  className,
}: {
  action: () => Promise<
    { ok: true; message: string; href: string } | { ok: false; message: string }
  >;
  title: string;
  copies: string;
  skips: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" className={className}>
          <CopyPlus className="size-3.5" aria-hidden />
          Duplicate
        </Button>
      }
      title={title}
      body={copies}
      consequence={skips}
      confirmLabel="Duplicate"
      onConfirm={async () => {
        const result = await action();
        if (result.ok) router.push(result.href);
        return result;
      }}
    />
  );
}
