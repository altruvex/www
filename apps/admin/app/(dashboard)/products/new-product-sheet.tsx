"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { RepositoryPicker, type RepositoryOption } from "@/components/os/repository-picker";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";

const KINDS = [
  { id: "WEBSITE", label: "Website" },
  { id: "WEB_APP", label: "Web app" },
  { id: "API", label: "API" },
  { id: "ECOMMERCE", label: "E-commerce" },
  { id: "LANDING_PAGE", label: "Landing page" },
  { id: "INTERNAL_TOOL", label: "Internal tool" },
] as const;

const STATUSES = [
  { id: "PLANNED", label: "Planned" },
  { id: "IN_DEVELOPMENT", label: "In development" },
  { id: "LIVE", label: "Live" },
  { id: "MAINTENANCE", label: "Maintenance" },
  { id: "SUNSET", label: "Sunset" },
] as const;

const NO_PROJECT = "__none__";

/** Mirrors the server's slug rule, so the error arrives before the request does. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Creating a product.
 *
 * The slug matters more than it looks: it is how a CI pipeline names this
 * product at the ingest endpoint, so it is derived from the name but stays
 * editable and is shown plainly rather than hidden as an implementation detail.
 */
export function NewProductSheet({
  clients,
  projects,
}: {
  clients: { id: string; label: string }[];
  projects: { id: string; name: string; clientId: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        New product
      </Button>
      {/* Remounted per opening so the form starts clean, with no effect syncing. */}
      {open && (
        <Form
          key="new-product"
          clients={clients}
          projects={projects}
          onClose={() => setOpen(false)}
          onCreated={(id) => {
            setOpen(false);
            router.push(`/products/${id}`);
          }}
        />
      )}
    </>
  );
}

function Form({
  clients,
  projects,
  onClose,
  onCreated,
}: {
  clients: { id: string; label: string }[];
  projects: { id: string; name: string; clientId: string }[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [clientId, setClientId] = React.useState(clients[0]?.id ?? "");
  const [projectId, setProjectId] = React.useState<string>(NO_PROJECT);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [kind, setKind] = React.useState<string>("WEBSITE");
  const [status, setStatus] = React.useState<string>("PLANNED");
  const [productionUrl, setProductionUrl] = React.useState("");
  const [repositoryUrl, setRepositoryUrl] = React.useState("");
  const [framework, setFramework] = React.useState("");
  const [detectingFramework, setDetectingFramework] = React.useState(false);
  const [frameworkEvidence, setFrameworkEvidence] = React.useState<string | null>(null);

  /**
   * Fills the form from the repository GitHub was asked about.
   *
   * Only fields the operator has left blank. A pick is a shortcut, not an
   * instruction to discard what somebody already typed — overwriting a name
   * chosen on purpose with a repository slug is the kind of "helpful" that
   * makes people stop using the shortcut.
   */
  async function importFromRepository(repo: RepositoryOption) {
    if (!name.trim()) setName(repo.name);
    if (!slugTouched && !slug.trim()) setSlug(slugify(repo.name));
    // A repository's homepage field is normally the live site, and is the one
    // piece of GitHub metadata that maps onto something this application
    // publishes. It is still only a default — a successful production deploy
    // overwrites it with what actually shipped.
    if (!productionUrl.trim() && repo.homepage) setProductionUrl(repo.homepage);

    // The framework comes from the repository's own manifest, not from
    // GitHub's `language` field — "TypeScript" is true of a Next.js site, an
    // Express API and a CLI alike, and is not an answer to "what is this built
    // with". Read on demand, and left blank when the repository does not say.
    if (framework.trim()) return;
    setDetectingFramework(true);
    try {
      const res = await fetch(
        `/api/admin/github/framework?repo=${encodeURIComponent(repo.fullName)}`,
      );
      const data = (await res.json()) as {
        success: boolean;
        framework?: string | null;
        evidence?: string | null;
      };
      if (data.success && data.framework) {
        setFramework(data.framework);
        // Which file answered. In a monorepo the root manifest names no
        // framework and the answer comes from one app inside it — saying which
        // is the difference between a value an operator can check and one they
        // have to trust.
        setFrameworkEvidence(data.evidence ?? null);
      }
    } catch {
      // Silent: the operator can type it, and a toast about a field that
      // pre-fills itself would be noise on a form they are still filling in.
    } finally {
      setDetectingFramework(false);
    }
  }

  // Only projects belonging to the chosen client — the server rejects a
  // mismatch, so offering one would be offering a guaranteed error.
  const availableProjects = projects.filter((p) => p.clientId === clientId);
  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !clientId || !effectiveSlug) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          projectId: projectId === NO_PROJECT ? null : projectId,
          name: name.trim(),
          slug: effectiveSlug,
          kind,
          status,
          productionUrl: productionUrl.trim() || null,
          repositoryUrl: repositoryUrl.trim() || null,
          framework: framework.trim() || null,
        }),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        product?: { id: string };
      };
      if (!data.success || !data.product) {
        toast.error(data.message ?? "The product could not be created.");
        return;
      }
      toast.success(`${name.trim()} added. Issue an ingest token to connect its pipeline.`);
      onCreated(data.product.id);
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New product</SheetTitle>
        </SheetHeader>
        <form className="space-y-3 overflow-y-auto p-4" onSubmit={submit}>
          <Field label="Client">
            <Select
              value={clientId}
              onValueChange={(value) => {
                setClientId(value);
                // The previously chosen project belongs to another client now.
                setProjectId(NO_PROJECT);
              }}
            >
              <SelectTrigger className="w-full" aria-label="Client">
                <SelectValue placeholder="Pick a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Project"
            hint="Optional. A product can outlive the project that built it, or exist before one."
          >
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full" aria-label="Project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>Not linked</SelectItem>
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nile Trading — corporate site"
              required
              maxLength={200}
            />
          </Field>

          <Field label="Slug" hint="How CI names this product at the ingest endpoint.">
            <Input
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="nile-trading-site"
              required
              className="font-mono"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-full" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Production URL" hint="Optional — a successful deploy sets this too.">
            <Input
              type="url"
              value={productionUrl}
              onChange={(event) => setProductionUrl(event.target.value)}
              placeholder="https://client-site.com"
            />
          </Field>

          <Field
            label="Repository"
            hint="Picking one fills in anything still blank. Nothing already typed is overwritten."
          >
            <RepositoryPicker
              value={repositoryUrl}
              onChange={setRepositoryUrl}
              onImport={importFromRepository}
            />
          </Field>

          <Field
            label="Framework"
            hint={
              detectingFramework
                ? "Reading the repository's manifest…"
                : frameworkEvidence
                  ? `Read from ${frameworkEvidence}`
                  : "Read from the repository when one is picked. Blank when it does not say."
            }
          >
            <Input
              value={framework}
              onChange={(event) => setFramework(event.target.value)}
              placeholder={detectingFramework ? "Detecting…" : "Next.js 16"}
              maxLength={100}
              disabled={detectingFramework}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={busy || !name.trim() || !clientId || !effectiveSlug}
            >
              {busy ? "Creating…" : "Create product"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="telemetry block text-subtle-foreground">{label}</span>
      {children}
      {hint && <span className="block text-meta text-subtle-foreground">{hint}</span>}
    </label>
  );
}
