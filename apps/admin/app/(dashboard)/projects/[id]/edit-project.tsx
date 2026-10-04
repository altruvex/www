"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button, Field, Input, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@repo/ui";
import { DateField } from "@/components/os/date-field";

import { updateProjectDetails } from "@/app/(dashboard)/_actions/projects";
import { useSheetSide } from "@/app/(dashboard)/calendar/sheet-shell";

export interface EditableProject {
  id: string;
  name: string;
  targetLaunchDate: string | null;
  stagingUrl: string | null;
  liveUrl: string | null;
}

export function EditProjectButton({ project }: { project: EditableProject }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" className="pointer-coarse:h-11" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <EditProjectSheet
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
  const sheet = useSheetSide();
  const [busy, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(project.name);
  const [target, setTarget] = React.useState(project.targetLaunchDate?.slice(0, 10) ?? "");
  const [stagingUrl, setStagingUrl] = React.useState(project.stagingUrl ?? "");
  const [liveUrl, setLiveUrl] = React.useState(project.liveUrl ?? "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={sheet.side} width="md" className={sheet.className}>
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
        </SheetHeader>
        <SheetBody className="overflow-y-auto">
        <form
          className="space-y-3"
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
              if (result.changed) toast.success(result.message);
              else toast(result.message);
              onOpenChange(false);
              router.refresh();
            });
          }}
        >
          <Field label="Name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={200}
            />
          </Field>

          <Field
            label="Target launch"
            hint="The date promised to the client. Leave empty if none was agreed. The actual launch date is recorded when the phase moves to Launched."
          >
            <DateField value={target} onChange={setTarget} />
          </Field>

          <Field label="Staging URL">
            <Input
              type="url"
              inputMode="url"
              value={stagingUrl}
              onChange={(event) => setStagingUrl(event.target.value)}
              placeholder="https://staging.example.com"
              maxLength={500}
            />
          </Field>

          <Field label="Live URL">
            <Input
              type="url"
              inputMode="url"
              value={liveUrl}
              onChange={(event) => setLiveUrl(event.target.value)}
              placeholder="https://example.com"
              maxLength={500}
            />
          </Field>

          {error && (
            <p role="alert" className="text-meta text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" className="pointer-coarse:h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" className="pointer-coarse:h-11" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
