"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui";

import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { Panel } from "@/components/os/panel";
import { MetaList } from "@/components/os/detail-layout";
import { dateTime } from "@/lib/format";

export function IngestTokenPanel({
  productId,
  slug,
  last4,
  issuedAt,
  canEdit,
}: {
  productId: string;
  slug: string;
  last4: string | null;
  issuedAt: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [issued, setIssued] = React.useState<string | null>(null);

  async function send(
    action: "rotate-token" | "revoke-token",
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id: productId }),
      });
      if (res.status === 401) {
        router.push("/login");
        return { ok: false, message: "Your session expired. Sign in again." };
      }
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        token?: string;
      };
      if (!data.success)
        return { ok: false, message: data.message ?? "That did not work." };
      setIssued(data.token ?? null);
      router.refresh();
      return data.token
        ? {
            ok: true,
            message: "New token issued. Copy it now — it is not shown again.",
          }
        : {
            ok: true,
            message:
              "Token revoked. CI can no longer report against this product.",
          };
    } catch {
      return {
        ok: false,
        message: "The request could not be sent. Check your connection.",
      };
    }
  }

  async function issue() {
    setPending(true);
    const result = await send("rotate-token");
    setPending(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied.`);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  return (
    <Panel
      title="CI ingest"
      description={
        last4
          ? "A pipeline can report to this product"
          : "No pipeline connected"
      }
      flush
    >
      <MetaList
        items={[
          {
            label: "Token",
            value: last4 ? (
              <span className="font-mono">···{last4}</span>
            ) : (
              <span className="text-muted-foreground">Not issued</span>
            ),
          },
          { label: "Issued", value: issuedAt ? dateTime(issuedAt) : "—" },
          {
            label: "Product slug",
            value: <span className="font-mono">{slug}</span>,
          },
        ]}
      />

      {issued && (
        <div className="border-t border-border-subtle bg-surface px-3 py-3">
          <p className="telemetry text-subtle-foreground">
            New token — shown once
          </p>
          <p className="mt-1.5 break-all rounded-ctl border border-border-subtle bg-background p-2 font-mono text-meta">
            {issued}
          </p>
          <p className="mt-1.5 text-meta text-muted-foreground">
            Store it in your pipeline&apos;s secrets now. It is not recoverable
            — only its hash is kept.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => copy(issued, "Token")}
          >
            <Copy className="size-3.5" />
            Copy token
          </Button>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-1.5 border-t border-border-subtle p-3">
          {last4 ? (
            <>
              <ConfirmDialog
                tone="danger"
                title="Rotate the ingest token?"
                body={`A new token is issued for ${slug} and shown once.`}
                consequence={`The current token (···${last4}) stops working immediately. Every pipeline or app that reports with it is refused until you replace it with the new one.`}
                confirmLabel="Rotate token"
                onConfirm={() => send("rotate-token")}
                trigger={
                  <Button variant="outline" size="sm">
                    <KeyRound className="size-3.5" />
                    Rotate token
                  </Button>
                }
              />
              <ConfirmDialog
                tone="danger"
                title="Revoke the ingest token?"
                consequence={`The token ···${last4} stops working immediately and no new one is issued. Builds, deployments and logs from CI are refused until you issue a token and update the pipeline.`}
                confirmLabel="Revoke token"
                onConfirm={() => send("revoke-token")}
                trigger={
                  <Button variant="destructive-ghost" size="sm">
                    Revoke
                  </Button>
                }
              />
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={issue}
            >
              <KeyRound className="size-3.5" />
              {pending ? "Issuing…" : "Issue ingest token"}
            </Button>
          )}
          <p className="mt-1 text-meta text-subtle-foreground">
            {last4
              ? "Rotating immediately stops the current token working. Update your pipeline before you rotate."
              : "POST builds, deployments and logs to /api/ingest/* with this token as a bearer credential."}
          </p>
        </div>
      )}
    </Panel>
  );
}
