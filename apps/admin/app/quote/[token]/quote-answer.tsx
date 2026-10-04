"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Button } from "@repo/ui";

type State =
  | { kind: "open" }
  | { kind: "approved"; by: string | null; on: string | null }
  | { kind: "declined"; on: string | null }
  | { kind: "expired" }
  | { kind: "closed" };

const fieldClass =
  "w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-lg text-foreground sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function QuoteAnswer({
  token,
  amount,
  amountLabel,
  answerable,
  state,
}: {
  token: string;
  amount: number;
  amountLabel: string;
  answerable: boolean;
  state: State;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"idle" | "decline">("idle");
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!answerable) return;
    void fetch(`/api/quote/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewed" }),
    }).catch(() => undefined);
  }, [answerable, token]);

  async function answer(action: "approve" | "decline") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/quote/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          amount,
          ...(action === "approve" ? { name: name.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Something went wrong, and your answer was not recorded.");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong, and your answer was not recorded. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "approved") {
    return (
      <Outcome icon={<CheckCircle2 className="size-10 text-success" aria-hidden />} title="Quote approved">
        {state.by ? `Approved by ${state.by}` : "Approved"}
        {state.on ? ` on ${state.on}` : ""}. Your answer is recorded — we will tell you when the
        work starts. You can close this page.
      </Outcome>
    );
  }
  if (state.kind === "declined") {
    return (
      <Outcome icon={<XCircle className="size-10 text-muted-foreground" aria-hidden />} title="Quote declined">
        Declined{state.on ? ` on ${state.on}` : ""}. Your answer is recorded and nothing will be
        billed for it. Reply to our message if you would like it scoped differently.
      </Outcome>
    );
  }
  if (state.kind === "expired" || state.kind === "closed" || !answerable) {
    return (
      <Outcome
        icon={<Clock className="size-10 text-muted-foreground" aria-hidden />}
        title={state.kind === "closed" ? "This request was closed" : "This quote has expired"}
      >
        {state.kind === "closed"
          ? "It can no longer be approved or declined, and nothing will be billed for it."
          : "Its price is no longer held, so it cannot be approved. Reply to our message and we will send a current one."}
      </Outcome>
    );
  }

  if (mode === "decline") {
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void answer("decline");
        }}
      >
        <div>
          <label htmlFor="quote-note" className="mb-2 block text-sm font-medium">
            Anything we should know? (optional)
          </label>
          <textarea
            id="quote-note"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="submit" variant="destructive" className="h-11 sm:order-2" disabled={busy} aria-busy={busy}>
            {busy ? "Sending…" : "Decline the quote"}
          </Button>
          <Button type="button" variant="outline" className="h-11 sm:order-1" onClick={() => setMode("idle")} disabled={busy}>
            Back
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length < 2) {
          setError("Type your name to approve.");
          return;
        }
        void answer("approve");
      }}
    >
      <div>
        <label htmlFor="quote-name" className="mb-2 block text-sm font-medium">
          Your name
        </label>
        <input
          id="quote-name"
          type="text"
          autoComplete="name"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Type your full name"
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="quote-approve-note" className="mb-2 block text-sm font-medium">
          Note (optional)
        </label>
        <textarea
          id="quote-approve-note"
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="brand" className="h-11 w-full" disabled={busy} aria-busy={busy}>
        {busy ? "Approving…" : `Approve ${amountLabel}`}
      </Button>
      <button
        type="button"
        className="mx-auto flex min-h-11 items-center rounded-xs px-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={() => {
          setError("");
          setMode("decline");
        }}
      >
        Decline instead
      </button>
    </form>
  );
}

function Outcome({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-2xl bg-muted/50 p-5 text-center" role="status">
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
