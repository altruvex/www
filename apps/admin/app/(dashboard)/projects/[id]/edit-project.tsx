"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button, Input, Sheet, SheetContent, SheetHeader, SheetTitle } from "@repo/ui";

import { updateProjectDetails } from "@/app/(dashboard)/_actions/projects";

export interface EditableProject {
  id: string;
  name: string;
  /** ISO string or null. */
  targetLaunchDate: string | null;
  stagingUrl: string | null;
  liveUrl: string | null;
}

export function EditProjectButton({ project }: { project: EditableProject }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <EditProjectSheet
        // Remount per opening so the form always starts from the saved record.
        key={open ? "open" : "closed"}
        open={open}
        onOpenChange={setOpen}
        project={project}
      />
    </>
  );
}

function EditProjectSheet({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: EditableProject;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(project.name);
  const [target, setTarget] = React.useState(project.targetLaunchDate?.slice(0, 10) ?? "");
  const [stagingUrl, setStagingUrl] = React.useState(project.stagingUrl ?? "");
  const [liveUrl, setLiveUrl] = React.useState(project.liveUrl ?? "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await updateProjectDetails(project.id, {
                name,
                targetLaunchDate: target,
                stagingUrl,
                liveUrl,
              });
              if (!result.ok) {
                setError(result.message);
                return;
              }
              if (result.changed) toast.success("Project saved.");
              else toast("Nothing changed.");
              onOpenChange(false);
              router.refresh();
            });
          }}
        >
          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={200}
            />
          </label>

          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Target launch</span>
            <Input type="date" value={target} onChange={(event) => setTarget(event.target.value)} />
            <span className="block text-meta text-subtle-foreground">
              The date promised to the client. Leave empty if none was agreed. The actual launch
              date is recorded when the phase moves to Launched.
            </span>
          </label>

          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Staging URL</span>
            <Input
              type="url"
              inputMode="url"
              value={stagingUrl}
              onChange={(event) => setStagingUrl(event.target.value)}
              placeholder="https://staging.example.com"
              maxLength={500}
            />
          </label>

          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Live URL</span>
            <Input
              type="url"
              inputMode="url"
              value={liveUrl}
              onChange={(event) => setLiveUrl(event.target.value)}
              placeholder="https://example.com"
              maxLength={500}
            />
          </label>

          {error && (
            <p role="alert" className="text-meta text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
