"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui";

import { Panel } from "@/components/os/panel";
import { MetaList } from "@/components/os/detail-layout";
import { dateTime } from "@/lib/format";

/**
 * Issues and revokes the per-product CI ingest token (§26).
 *
 * The plaintext token is rendered exactly once, from the response that created
 * it. It is never stored in plaintext and never re-fetched, so "show it to me
 * again" is genuinely impossible rather than merely discouraged — losing it
 * costs a rotation, which is the correct price.
 */
export function IngestTokenPanel({
  productId,
  slug,
  last4,
  issuedAt,
}: {
  productId: string;
  slug: string;
  last4: string | null;
  issuedAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"rotate" | "revoke" | null>(null);
  const [issued, setIssued] = React.useState<string | null>(null);

  async function run(action: "rotate-token" | "revoke-token") {
    const kind = action === "rotate-token" ? "rotate" : "revoke";
    setPending(kind);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id: productId }),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        token?: string;
      };
      if (!data.success) {
        toast.error(data.message ?? "That did not work.");
        return;
      }
      if (data.token) {
        setIssued(data.token);
        toast.success("New token issued. Copy it now — it is not shown again.");
      } else {
        setIssued(null);
        toast.success("Token revoked. CI can no longer report against this product.");
      }
      router.refresh();
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setPending(null);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied.`);
    } catch {
      // Clipboard is blocked in some contexts; the value is on screen to select.
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  return (
    <Panel
      title="CI ingest"
      description={last4 ? "A pipeline can report to this product" : "No pipeline connected"}
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
          { label: "Product slug", value: <span className="font-mono">{slug}</span> },
        ]}
      />

      {issued && (
        <div className="border-t border-border bg-surface px-3 py-3">
          <p className="telemetry text-subtle-foreground">New token — shown once</p>
          <p className="mt-1.5 break-all rounded-sm border border-border bg-background p-2 font-mono text-meta">
            {issued}
          </p>
          <p className="mt-1.5 text-meta text-muted-foreground">
            Store it in your pipeline&apos;s secrets now. It is not recoverable — only its
            hash is kept.
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

      <div className="flex flex-col gap-1.5 border-t border-border p-3">
        <Button
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => run("rotate-token")}
        >
          <KeyRound className="size-3.5" />
          {pending === "rotate"
            ? "Issuing…"
            : last4
              ? "Rotate token"
              : "Issue ingest token"}
        </Button>
        {last4 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending !== null}
            onClick={() => run("revoke-token")}
          >
            {pending === "revoke" ? "Revoking…" : "Revoke"}
          </Button>
        )}
        <p className="mt-1 text-meta text-subtle-foreground">
          {last4
            ? "Rotating immediately stops the current token working. Update your pipeline before you rotate."
            : "POST builds, deployments and logs to /api/ingest/* with this token as a bearer credential."}
        </p>
      </div>
    </Panel>
  );
}
