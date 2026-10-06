"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui";

import { MetaList } from "@/components/os/detail-layout";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { Panel } from "@/components/os/panel";
import { RepositoryPicker } from "@/components/os/repository-picker";

export function GithubPanel({
  productId,
  repositoryUrl,
  repoSlug,
  webhookUrl,
  secretConfigured,
  lastEventAt,
  canEdit,
}: {
  productId: string;
  repositoryUrl: string | null;
  repoSlug: string | null;
  webhookUrl: string;
  secretConfigured: boolean;
  lastEventAt: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(repositoryUrl ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save(url: string | null): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: productId,
          patch: { repositoryUrl: url },
        }),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return false;
      }
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) {
        toast.error(data.message ?? "That did not work.");
        return false;
      }
      toast.success(url ? "Repository linked." : "Repository unlinked.");
      setEditing(false);
      router.refresh();
      return true;
    } catch {
      toast.error("The request could not be sent. Check your connection.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied.`);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  const ready = Boolean(repoSlug) && secretConfigured;

  return (
    <Panel
      title="GitHub"
      description={
        lastEventAt
          ? "Builds and deployments are arriving from GitHub"
          : ready
            ? "Waiting for the first event from GitHub"
            : "Not connected"
      }
      flush
    >
      <MetaList
        items={[
          {
            label: "Repository",
            value: repoSlug ? (
              <span className="font-mono">{repoSlug}</span>
            ) : repositoryUrl ? (
              <span className="text-warning">Not a GitHub URL</span>
            ) : (
              <span className="text-muted-foreground">Not set</span>
            ),
          },
          {
            label: "Webhook secret",
            value: secretConfigured ? (
              "Configured"
            ) : (
              <span className="text-warning">Missing</span>
            ),
          },
          { label: "Last event", value: lastEventAt ?? "None yet" },
        ]}
      />

      {!canEdit ? null : editing ? (
        <div className="space-y-2 border-t border-border-subtle p-3">
          <RepositoryPicker
            value={draft}
            onChange={setDraft}
            excludeProductId={productId}
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="brand"
              disabled={saving}
              onClick={() => save(draft.trim() || null)}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setDraft(repositoryUrl ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            {repositoryUrl && (
              <ConfirmDialog
                tone="danger"
                title="Unlink the repository?"
                consequence="GitHub events for this repository stop matching this product: new workflow runs and deployments are no longer recorded here. History already recorded stays."
                confirmLabel="Unlink"
                onConfirm={async () => {
                  const ok = await save(null);
                  if (!ok)
                    return {
                      ok: false,
                      message: "The repository is still linked.",
                    };
                }}
                trigger={
                  <Button
                    size="sm"
                    variant="destructive-ghost"
                    disabled={saving}
                    className="ms-auto"
                  >
                    Unlink
                  </Button>
                }
              />
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-border-subtle p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setEditing(true)}
          >
            <Link2 className="size-3.5" />
            {repositoryUrl ? "Change repository" : "Link a repository"}
          </Button>
        </div>
      )}

      <div className="space-y-2 border-t border-border-subtle p-3">
        <p className="text-meta text-subtle-foreground">
          {!repositoryUrl
            ? "Link this product's repository above — every GitHub event is matched to a product by the repository it names."
            : !repoSlug
              ? "The repository URL on this product is not a github.com repository, so no delivery can be matched to it."
              : !secretConfigured
                ? "Set GITHUB_WEBHOOK_SECRET on the server. Until then every delivery is refused — an unverified webhook is an unauthenticated write."
                : "Install the Altruvex GitHub App once on the account or organization that owns this repository, and give it access to this repository. Nothing is set per repository: the App reports workflow runs and deployments, and this product's Repository field decides where they land."}
        </p>
      </div>

      <details className="border-t border-border-subtle p-3">
        <summary className="cursor-pointer text-meta text-subtle-foreground">
          Without the App: a webhook on this repository
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <p className="telemetry text-subtle-foreground">Payload URL</p>
            <p className="mt-1 break-all rounded-ctl border border-border-subtle bg-surface p-2 font-mono text-meta">
              {webhookUrl}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => copy(webhookUrl, "Payload URL")}
          >
            <Copy className="size-3.5" />
            Copy payload URL
          </Button>
          {repoSlug && (
            <Button asChild variant="ghost" size="sm" className="w-full">
              <a
                href={`https://github.com/${repoSlug}/settings/hooks/new`}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink className="size-3.5" />
                Add the webhook on GitHub
              </a>
            </Button>
          )}
          <p className="text-meta text-subtle-foreground">
            Content type application/json, the same secret as the server, and
            the events “Workflow runs” and “Deployment statuses”. Use this or
            the App for a repository, not both, and do not also post to
            /api/ingest/* from the same workflow — every run would be recorded
            twice.
          </p>
        </div>
      </details>
    </Panel>
  );
}
