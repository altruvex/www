"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui";

import { MetaList } from "@/components/os/detail-layout";
import { Panel } from "@/components/os/panel";
import { RepositoryPicker } from "@/components/os/repository-picker";

/**
 * Setup state for the GitHub webhook (§26).
 *
 * There is nothing to click here that connects anything — the connection is
 * made in GitHub, by a person with admin rights on the repository. What this
 * panel does is say which of the three conditions are already true, so the one
 * that is missing is the thing on screen rather than something to go hunting
 * for: a repository URL on this product, a secret on the server, and a webhook
 * pointed at this URL.
 */
export function GithubPanel({
  productId,
  repositoryUrl,
  repoSlug,
  webhookUrl,
  secretConfigured,
  lastEventAt,
}: {
  productId: string;
  repositoryUrl: string | null;
  repoSlug: string | null;
  webhookUrl: string;
  secretConfigured: boolean;
  lastEventAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(repositoryUrl ?? "");
  const [saving, setSaving] = React.useState(false);

  /**
   * The panel used to say "set this product's repository URL first" and offer
   * nothing to set it with — the only editor was the create form, so an
   * existing product could be told what was missing and given no way to supply
   * it.
   */
  async function save(url: string | null) {
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
        return;
      }
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) {
        toast.error(data.message ?? "That did not work.");
        return;
      }
      toast.success(url ? "Repository linked." : "Repository unlinked.");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("The request could not be sent. Check your connection.");
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
            ? "Ready for a webhook"
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

      {editing ? (
        <div className="space-y-2 border-t border-border p-3">
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
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                className="ml-auto"
                onClick={() => save(null)}
              >
                Unlink
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-border p-3">
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

      <div className="space-y-2 border-t border-border p-3">
        <div>
          <p className="telemetry text-subtle-foreground">Payload URL</p>
          <p className="mt-1 break-all rounded-sm border border-border bg-surface p-2 font-mono text-meta">
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
          {!repositoryUrl
            ? "Set this product's repository URL first — the webhook is matched to a product by the repository it names."
            : !repoSlug
              ? "The repository URL on this product is not a github.com repository, so no delivery can be matched to it."
              : !secretConfigured
                ? "Set GITHUB_WEBHOOK_SECRET on the server. Until then every delivery is refused — an unverified webhook is an unauthenticated write."
                : "Content type application/json, the same secret as the server, and the events “Workflow runs” and “Deployment statuses”. Do not also post to /api/ingest/* from the same workflow, or every run is recorded twice."}
        </p>
      </div>
    </Panel>
  );
}
