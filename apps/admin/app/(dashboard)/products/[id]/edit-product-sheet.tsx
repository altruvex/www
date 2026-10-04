"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

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

import { RepositoryPicker } from "@/components/os/repository-picker";
import { statusOf } from "@/lib/status";

const KINDS = [
  "WEBSITE",
  "WEB_APP",
  "API",
  "ECOMMERCE",
  "LANDING_PAGE",
  "INTERNAL_TOOL",
] as const;
const STATUSES = [
  "PLANNED",
  "IN_DEVELOPMENT",
  "LIVE",
  "MAINTENANCE",
  "SUNSET",
] as const;
const NO_PROJECT = "__none__";

export interface EditableProduct {
  id: string;
  name: string;
  kind: string;
  status: string;
  projectId: string | null;
  productionUrl: string | null;
  stagingUrl: string | null;
  repositoryUrl: string | null;
  framework: string | null;
  hostingProvider: string | null;
}

type Draft = Omit<EditableProduct, "id">;

export function EditProductSheet({
  product,
  projects,
}: {
  product: EditableProduct;
  projects: { id: string; name: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
      {open && (
        <Form
          product={product}
          projects={projects}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Form({
  product,
  projects,
  onClose,
}: {
  product: EditableProduct;
  projects: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>({
    name: product.name,
    kind: product.kind,
    status: product.status,
    projectId: product.projectId,
    productionUrl: product.productionUrl,
    stagingUrl: product.stagingUrl,
    repositoryUrl: product.repositoryUrl,
    framework: product.framework,
    hostingProvider: product.hostingProvider,
  });

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const normalized: Draft = {
    ...draft,
    name: draft.name.trim(),
    productionUrl: draft.productionUrl?.trim() || null,
    stagingUrl: draft.stagingUrl?.trim() || null,
    repositoryUrl: draft.repositoryUrl?.trim() || null,
    framework: draft.framework?.trim() || null,
    hostingProvider: draft.hostingProvider?.trim() || null,
  };
  const patch = Object.fromEntries(
    (Object.keys(normalized) as (keyof Draft)[])
      .filter((key) => normalized[key] !== product[key])
      .map((key) => [key, normalized[key]]),
  );
  const dirty = Object.keys(patch).length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!normalized.name || !dirty) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update", id: product.id, patch }),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!res.ok || !data.success) {
        toast.error(data.message ?? "The product could not be saved.");
        return;
      }
      toast.success(`${normalized.name} saved.`);
      onClose();
      router.refresh();
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
          <SheetTitle>Edit product</SheetTitle>
        </SheetHeader>
        <form className="space-y-3 overflow-y-auto p-4" onSubmit={submit}>
          <Field label="Name">
            <Input
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              required
              maxLength={200}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select
                value={draft.kind}
                onValueChange={(value) => set("kind", value)}
              >
                <SelectTrigger className="w-full" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {statusOf("productKind", kind).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status">
              <Select
                value={draft.status}
                onValueChange={(value) => set("status", value)}
              >
                <SelectTrigger className="w-full" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusOf("productStatus", status).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Project"
            hint="Only this client's projects. A product can outlive the project that built it."
          >
            <Select
              value={draft.projectId ?? NO_PROJECT}
              onValueChange={(value) =>
                set("projectId", value === NO_PROJECT ? null : value)
              }
            >
              <SelectTrigger className="w-full" aria-label="Project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>Not linked</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Production URL"
            hint="A successful production deploy updates this too."
          >
            <Input
              type="url"
              value={draft.productionUrl ?? ""}
              onChange={(event) => set("productionUrl", event.target.value)}
              placeholder="https://client-site.com"
            />
          </Field>

          <Field label="Staging URL">
            <Input
              type="url"
              value={draft.stagingUrl ?? ""}
              onChange={(event) => set("stagingUrl", event.target.value)}
              placeholder="https://staging.client-site.com"
            />
          </Field>

          <Field label="Repository">
            <RepositoryPicker
              value={draft.repositoryUrl ?? ""}
              onChange={(url) => set("repositoryUrl", url)}
              excludeProductId={product.id}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Framework">
              <Input
                value={draft.framework ?? ""}
                onChange={(event) => set("framework", event.target.value)}
                placeholder="Next.js 16"
                maxLength={100}
              />
            </Field>
            <Field label="Hosting">
              <Input
                value={draft.hostingProvider ?? ""}
                onChange={(event) => set("hostingProvider", event.target.value)}
                placeholder="Vercel"
                maxLength={100}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={busy || !normalized.name || !dirty}
            >
              {busy ? "Saving…" : "Save changes"}
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
      {hint && (
        <span className="block text-meta text-subtle-foreground">{hint}</span>
      )}
    </label>
  );
}
