"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Pin, PinOff } from "lucide-react";
import { Button, Hint, Textarea } from "@repo/ui";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { dateTime, when } from "@/lib/format";
import {
  addClientNote,
  editClientNote,
  setClientNotePinned,
} from "@/app/(dashboard)/_actions/clients";

export interface ClientNoteItem {
  id: string;
  body: string;
  authorLabel: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export function ClientNotes({
  clientId,
  clientLabel,
  notes,
  canWrite = true,
  canDelete = true,
}: {
  clientId: string;
  clientLabel: string;
  notes: ClientNoteItem[];
  canWrite?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function run(
    action: () => Promise<ActionResult>,
    success: string,
    after?: () => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.message) toast(result.message);
      else toast.success(success);
      after?.();
      router.refresh();
    });
  }

  return (
    <Panel
      title="Internal notes"
      description="Never shown to the client, and never copied into Slack or the audit summary."
      flush
    >
      {canWrite && (
        <form
          className="space-y-2 border-b border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => addClientNote(clientId, draft),
              "Note added",
              () => setDraft(""),
            );
          }}
        >
          <label htmlFor="client-note" className="sr-only">
            New note on {clientLabel}
          </label>
          <Textarea
            id="client-note"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`What should the next person working with ${clientLabel} know?`}
            rows={3}
            maxLength={5000}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending || !draft.trim()}
            >
              Add note
            </Button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <EmptyInline>
          No notes yet. Notes are for what the records cannot hold: who decides,
          what was promised on a call, what to avoid.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              pending={pending}
              run={run}
              canWrite={canWrite}
              canDelete={canDelete}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NoteRow({
  note,
  pending,
  run,
  canWrite,
  canDelete,
}: {
  note: ClientNoteItem;
  canWrite: boolean;
  canDelete: boolean;
  pending: boolean;
  run: (
    action: () => Promise<ActionResult>,
    success: string,
    after?: () => void,
  ) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [body, setBody] = React.useState(note.body);
  const edited = note.updatedAt !== note.createdAt;

  return (
    <li className="px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
        {note.pinned && (
          <span className="inline-flex items-center gap-1 text-foreground">
            <Pin className="size-3" aria-hidden />
            Pinned
          </span>
        )}
        <span>{note.authorLabel}</span>
        <Hint label={dateTime(note.createdAt)}>
          <time dateTime={note.createdAt}>· {when(note.createdAt)}</time>
        </Hint>
        {edited && (
          <Hint label={`Edited ${dateTime(note.updatedAt)}`}>
            <span>· edited</span>
          </Hint>
        )}
        <span className="ms-auto flex items-center gap-1">
          {canWrite && (
            <Hint label={note.pinned ? "Unpin" : "Pin to the top"}>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label={note.pinned ? "Unpin note" : "Pin note"}
                onClick={() =>
                  run(
                    () => setClientNotePinned(note.id, !note.pinned),
                    note.pinned ? "Note unpinned" : "Note pinned",
                  )
                }
              >
                {note.pinned ? (
                  <PinOff className="size-3.5" />
                ) : (
                  <Pin className="size-3.5" />
                )}
              </Button>
            </Hint>
          )}
          {canWrite && (
            <Hint label="Edit">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label="Edit note"
                aria-expanded={editing}
                onClick={() => {
                  setBody(note.body);
                  setEditing((v) => !v);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </Hint>
          )}
          {canDelete && (
            <DeleteRecordButton
              entity="clientNote"
              id={note.id}
              label="this note"
              size="icon-sm"
            >
              <span className="sr-only">Delete note</span>
            </DeleteRecordButton>
          )}
        </span>
      </div>

      {editing ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => editClientNote(note.id, body),
              "Note saved",
              () => setEditing(false),
            );
          }}
        >
          <label htmlFor={`note-${note.id}`} className="sr-only">
            Edit note
          </label>
          <Textarea
            id={`note-${note.id}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={5000}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending || !body.trim()}
            >
              Save
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-1 max-w-prose whitespace-pre-wrap text-base">
          {note.body}
        </p>
      )}
    </li>
  );
}
