"use me";
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquarePlus, Send, CornerDownLeft } from "lucide-react";
import { Panel } from "@/components/os/panel";
import { Button } from "@repo/ui";
import { Textarea } from "@repo/ui";
import { EmptyInline } from "@/components/os/empty-state";
import { dateTime, when, initials } from "@/lib/format";
import { addSubmissionNote } from "@/app/(dashboard)/_actions/records";

export interface NoteItem {
  id: string;
  content: string;
  type: string;
  createdAt: string | Date;
  createdBy: {
    name: string | null;
    email: string;
  };
}

export function NotesPanel({
  submissionId,
  initialNotes,
}: {
  submissionId: string;
  initialNotes: NoteItem[];
}) {
  const router = useRouter();
  const [notes, setNotes] = React.useState<NoteItem[]>(initialNotes);
  const [content, setContent] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      try {
        const created = await addSubmissionNote(submissionId, content);
        setNotes((prev) => [
          ...prev,
          {
            id: created.id,
            content: created.content,
            type: created.type,
            createdAt: created.createdAt,
            createdBy: {
              name: created.createdBy.name,
              email: created.createdBy.email,
            },
          },
        ]);
        setContent("");
        toast.success("Internal note added");
        router.refresh();
      } catch (err) {
        toast.error("Could not add note", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  };

  return (
    <Panel
      title="Internal notes"
      description="Private team memory. Never shown to clients or visitors."
      flush
    >
      {/* Existing Notes List */}
      {notes.length === 0 ? (
        <EmptyInline>
          No notes on this submission. Notes are internal and never leave the system.
        </EmptyInline>
      ) : (
        <ul className="rows divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="px-3.5 py-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-micro font-medium text-foreground">
                  {note.createdBy.name ?? note.createdBy.email}
                </span>
                <span
                  title={dateTime(note.createdAt)}
                  className="font-mono text-micro text-subtle-foreground"
                >
                  {when(note.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-meta text-muted-foreground leading-relaxed">
                {note.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Note Composer */}
      <form onSubmit={handleAddNote} className="border-t border-border p-3 bg-surface/30 space-y-2">
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an internal note or call summary…"
          aria-label="New note"
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-micro text-subtle-foreground">
            Press Post to record note
          </span>
          <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
            <Send />
            {isPending ? "Posting…" : "Post note"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
