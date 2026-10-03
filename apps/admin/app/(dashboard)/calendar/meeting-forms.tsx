"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Field, Input, SelectField, Textarea } from "@repo/ui";

/**
 * Meeting forms. Every one calls /api/admin/meetings and only reports success
 * when the server said so — a refusal stays on screen as the server's sentence.
 */

type ApiResult = {
  success?: boolean;
  message?: string;
  issues?: { path?: (string | number)[]; message?: string }[];
  meeting?: { id: string };
};

async function call(method: "POST" | "PATCH", body: Record<string, unknown>): Promise<ApiResult> {
  try {
    const res = await fetch("/api/admin/meetings", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult;
    if (res.ok && data.success) return data;
    const issue = data.issues?.[0];
    return {
      success: false,
      message: issue
        ? `${issue.path?.join(".") ?? "Field"}: ${issue.message ?? "invalid"}`
        : (data.message ?? "The server refused the change."),
    };
  } catch {
    return { success: false, message: "Could not reach the server." };
  }
}

const TYPES = [
  { id: "DISCOVERY", label: "Discovery" },
  { id: "CONSULTATION", label: "Consultation" },
  { id: "PROPOSAL", label: "Proposal" },
  { id: "FOLLOWUP", label: "Follow-up" },
] as const;

export function NewMeetingForm({
  clients,
  lockedClient,
  closeHref,
}: {
  clients: { id: string; label: string }[];
  /** From `?client=` — the meeting is for this client and the picker is not offered. */
  lockedClient: { id: string; label: string } | null;
  closeHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    type: "DISCOVERY",
    date: "",
    time: "",
    duration: "30",
    clientId: "",
    url: "",
    notes: "",
  });
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const clientId = lockedClient?.id ?? (form.clientId || undefined);
    const result = await call("POST", {
      title: form.title.trim(),
      type: form.type,
      scheduledDate: form.date,
      scheduledTime: form.time,
      durationMinutes: Number(form.duration),
      clientId,
      meetingUrl: form.url.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    setBusy(false);
    if (!result.success || !result.meeting) {
      setError(result.message ?? "The meeting was not created.");
      return;
    }
    toast.success("Meeting scheduled");
    router.push(`/calendar?meeting=${result.meeting.id}`, { scroll: false });
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <Field label="Title">
        <Input
          value={form.title}
          onChange={(e) => set("title")(e.target.value)}
          placeholder="Kick-off call"
          required
          maxLength={200}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <SelectField value={form.type} onChange={(e) => set("type")(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="Duration (minutes)">
          <Input
            type="number"
            value={form.duration}
            onChange={(e) => set("duration")(e.target.value)}
            required
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} required />
        </Field>
        <Field label="Time">
          <Input type="time" value={form.time} onChange={(e) => set("time")(e.target.value)} required />
        </Field>
      </div>

      {lockedClient ? (
        <Field label="Client">
          <p className="flex h-[var(--control-h)] items-center rounded-md border border-border bg-surface px-3 text-sm">
            {lockedClient.label}
          </p>
        </Field>
      ) : (
        <Field label="Client" hint="Optional. Linking puts the meeting on the client's page.">
          <SelectField value={form.clientId} onChange={(e) => set("clientId")(e.target.value)}>
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </SelectField>
        </Field>
      )}

      <Field label="Meeting link" hint="Optional. http(s) only — a call or video link.">
        <Input
          type="url"
          value={form.url}
          onChange={(e) => set("url")(e.target.value)}
          placeholder="https://meet.example.com/…"
        />
      </Field>

      <Field label="Notes">
        <Textarea
          value={form.notes}
          onChange={(e) => set("notes")(e.target.value)}
          maxLength={2000}
          className="min-h-20"
        />
      </Field>

      <p className="text-meta text-muted-foreground">
        No invitation is sent. Share the link yourself — nothing here emails or syncs to a calendar.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => router.push(closeHref, { scroll: false })}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={busy || !form.title.trim() || !form.date || !form.time}>
          {busy ? "Scheduling…" : "Schedule meeting"}
        </Button>
      </div>
    </form>
  );
}

export function RescheduleForm({
  meetingId,
  date,
  time,
  duration,
  url,
}: {
  meetingId: string;
  date: string;
  time: string;
  duration: number;
  url: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [v, setV] = React.useState({ date, time, duration: String(duration), url });
  const dirty =
    v.date !== date || v.time !== time || v.duration !== String(duration) || v.url.trim() !== url;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await call("PATCH", {
      id: meetingId,
      scheduledDate: v.date,
      scheduledTime: v.time,
      durationMinutes: Number(v.duration),
      meetingUrl: v.url.trim() || null,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.message ?? "The meeting was not changed.");
      return;
    }
    toast.success("Meeting updated");
    router.refresh();
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} required />
        </Field>
        <Field label="Time">
          <Input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} required />
        </Field>
        <Field label="Duration (min)">
          <Input
            type="number"
            value={v.duration}
            onChange={(e) => setV({ ...v, duration: e.target.value })}
            required
          />
        </Field>
        <Field label="Meeting link">
          <Input
            type="url"
            value={v.url}
            onChange={(e) => setV({ ...v, url: e.target.value })}
            placeholder="https://…"
          />
        </Field>
      </div>
      <p className="text-meta text-muted-foreground">
        The guest is not told. Send them the new time yourself.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={busy || !dirty}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function AdminNotesForm({ meetingId, notes }: { meetingId: string; notes: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [value, setValue] = React.useState(notes);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await call("PATCH", { id: meetingId, adminNotes: value.trim() || null });
    setBusy(false);
    if (!result.success) {
      setError(result.message ?? "The note was not saved.");
      return;
    }
    toast.success("Note saved");
    router.refresh();
  }

  return (
    <form className="space-y-2" onSubmit={submit}>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={1000}
        aria-label="Internal notes"
        placeholder="Internal only — never shown to the guest."
        className="min-h-20"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={busy || value.trim() === notes}>
        {busy ? "Saving…" : "Save note"}
      </Button>
    </form>
  );
}

export function LinkClientButton({
  meetingId,
  clientId,
  clientName,
}: {
  meetingId: string;
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function link() {
    setBusy(true);
    const result = await call("PATCH", { id: meetingId, clientId });
    setBusy(false);
    if (!result.success) {
      toast.error("Could not link the meeting", { description: result.message });
      return;
    }
    toast.success(`Linked to ${clientName}`);
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={link}>
      {busy ? "Linking…" : `Link to ${clientName}`}
    </Button>
  );
}
