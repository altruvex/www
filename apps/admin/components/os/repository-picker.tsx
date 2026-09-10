"use client";

import * as React from "react";
import { Check, Lock, Search } from "lucide-react";

import { Button, Input } from "@repo/ui";

import { cn } from "@/lib/utils";

/**
 * Attaching a repository to a product, by picking it or by typing it (§26).
 *
 * Both, deliberately. Picking is right for the common case — a repository
 * Altruvex owns, where a typo produces a product no webhook will ever match and
 * no error anybody sees. Typing is right for everything else: an open-source
 * repository, a client's own account, anything no token here can see. Offering
 * only the list would make the second case impossible; offering only the field
 * leaves the first case one character away from silently broken.
 *
 * The list also says which repositories are already attached to another
 * product, because the webhook receiver refuses an event a second product
 * claims — better to see that here than to find out when a build goes missing.
 */

export interface RepositoryOption {
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  isPrivate: boolean;
  language: string | null;
  defaultBranch: string;
  pushedAt: string | null;
  archived: boolean;
  takenBy: { id: string; name: string } | null;
}

interface ListResponse {
  success: boolean;
  mode?: "token" | "public" | "none";
  repositories?: RepositoryOption[];
  message?: string;
}

export function RepositoryPicker({
  value,
  onChange,
  onImport,
  excludeProductId,
}: {
  /** The repository URL currently on the product, or "". */
  value: string;
  onChange: (url: string) => void;
  /**
   * Called when a repository is picked, with everything GitHub knows that a
   * product has a field for. The caller decides what to pre-fill — this
   * component does not reach into a form it does not own.
   */
  onImport?: (repo: RepositoryOption) => void;
  /** A product may keep its own repository without it reading as taken. */
  excludeProductId?: string;
}) {
  const [mode, setMode] = React.useState<"pick" | "manual">("pick");
  const [repositories, setRepositories] = React.useState<RepositoryOption[] | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  // Starts true rather than being set inside the effect: the fetch is the first
  // thing that happens on mount, so "loading" is the honest initial state and a
  // synchronous setState in an effect body only costs an extra render.
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/github/repositories")
      .then((res) => res.json() as Promise<ListResponse>)
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          setNotice(data.message ?? "Repositories could not be listed.");
          // Falling back rather than blocking: not being able to *list*
          // repositories says nothing about whether the operator knows the URL.
          setMode("manual");
          return;
        }
        setRepositories(data.repositories ?? []);
        if (data.mode === "none" || (data.repositories ?? []).length === 0) {
          setNotice(
            data.message ??
              "No repositories are visible to this instance, so there is nothing to pick from.",
          );
          setMode("manual");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setNotice("GitHub could not be reached. Enter the URL by hand.");
        setMode("manual");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    const list = repositories ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, 50);
    return list
      .filter(
        (repo) =>
          repo.fullName.toLowerCase().includes(q) ||
          (repo.description ?? "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [repositories, query]);

  const selected = value.trim().toLowerCase();
  const canPick = (repositories?.length ?? 0) > 0;

  return (
    <div className="space-y-2">
      {/* Only a real choice is offered one. When nothing can be listed there is
          no second mode to switch to, and a disabled tab sitting above a note
          explaining why it is disabled reads as a fault rather than as a
          setting nobody has turned on. */}
      {canPick && (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={mode === "pick" ? "outline" : "ghost"}
            onClick={() => setMode("pick")}
          >
            From GitHub
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "outline" : "ghost"}
            onClick={() => setMode("manual")}
          >
            Enter a URL
          </Button>
        </div>
      )}

      {mode === "manual" ? (
        <>
          <Input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://github.com/owner/repo"
          />
          <p className="text-meta text-subtle-foreground">
            Any repository, including one this instance cannot see — an open-source project, or a
            client&apos;s own account.
          </p>
        </>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={loading ? "Loading repositories…" : "Search repositories"}
              className="pl-7"
              disabled={loading}
            />
          </div>

          <ul className="max-h-64 overflow-y-auto rounded-md border border-border">
            {filtered.length === 0 && !loading && (
              <li className="px-3 py-2.5 text-meta text-subtle-foreground">
                Nothing matches that.
              </li>
            )}
            {filtered.map((repo) => {
              const isSelected = repo.htmlUrl.toLowerCase() === selected;
              const taken = repo.takenBy && repo.takenBy.id !== excludeProductId;
              return (
                <li key={repo.fullName} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(repo.htmlUrl);
                      onImport?.(repo);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors duration-[var(--dur-state)] hover:bg-surface",
                      isSelected && "bg-surface",
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <Check className="size-3.5 text-brand" />
                      ) : repo.isPrivate ? (
                        <Lock className="size-3.5 text-subtle-foreground" />
                      ) : (
                        <span className="block size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-meta">{repo.fullName}</span>
                      {repo.description && (
                        <span className="block truncate text-meta text-muted-foreground">
                          {repo.description}
                        </span>
                      )}
                      <span className="mt-0.5 flex flex-wrap gap-x-2 text-micro text-subtle-foreground">
                        {repo.language && <span>{repo.language}</span>}
                        {repo.archived && <span className="text-warning">archived</span>}
                        {taken && (
                          <span className="text-warning">already on {repo.takenBy!.name}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {notice && (
        <p className={cn("text-meta", canPick ? "text-warning" : "text-subtle-foreground")}>
          {notice}
        </p>
      )}
    </div>
  );
}
