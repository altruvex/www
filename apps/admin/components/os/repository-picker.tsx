"use client";

import * as React from "react";
import { Check, Lock, Search } from "lucide-react";

import { Button, Input } from "@repo/ui";

import { cn } from "@/lib/utils";

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

const SHOWN = 50;

export function RepositoryPicker({
  value,
  onChange,
  onImport,
  excludeProductId,
}: {
  value: string;
  onChange: (url: string) => void;
  onImport?: (repo: RepositoryOption) => void;
  excludeProductId?: string;
}) {
  const [mode, setMode] = React.useState<"pick" | "manual">("pick");
  const [repositories, setRepositories] = React.useState<RepositoryOption[] | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
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

  const { filtered, matches } = React.useMemo(() => {
    const list = repositories ?? [];
    const q = query.trim().toLowerCase();
    const hits = q
      ? list.filter(
          (repo) =>
            repo.fullName.toLowerCase().includes(q) ||
            (repo.description ?? "").toLowerCase().includes(q),
        )
      : list;
    return { filtered: hits.slice(0, SHOWN), matches: hits.length };
  }, [repositories, query]);

  const selected = value.trim().toLowerCase();
  const canPick = (repositories?.length ?? 0) > 0;

  return (
    <div className="space-y-2">
      {canPick && (
        <div role="group" aria-label="How to choose the repository" className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={mode === "pick" ? "outline" : "ghost"}
            aria-pressed={mode === "pick"}
            onClick={() => setMode("pick")}
          >
            From GitHub
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "outline" : "ghost"}
            aria-pressed={mode === "manual"}
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
            <Search className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={loading ? "Loading repositories…" : "Search repositories"}
              aria-label="Search repositories"
              className="ps-7"
              disabled={loading}
            />
          </div>

          <ul className="max-h-64 overflow-y-auto rounded-ctl-xl border border-border-subtle">
            {filtered.length === 0 && !loading && (
              <li className="px-3 py-2.5 text-meta text-subtle-foreground">
                Nothing matches that.
              </li>
            )}
            {filtered.map((repo) => {
              const isSelected = repo.htmlUrl.toLowerCase() === selected;
              const taken = repo.takenBy && repo.takenBy.id !== excludeProductId;
              return (
                <li key={repo.fullName} className="border-b border-border-subtle last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      onChange(repo.htmlUrl);
                      onImport?.(repo);
                    }}
                    className={cn(
                      "flex min-h-11 w-full items-start gap-2 px-3 py-2 text-start sm:min-h-0 transition-colors duration-[var(--dur-state)] hover:bg-surface",
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
          {matches > filtered.length && (
            <p className="text-meta text-subtle-foreground">
              Showing the first {filtered.length} of {matches}. Search to narrow the list.
            </p>
          )}
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
