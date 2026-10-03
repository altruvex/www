"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";

import { Button, Field, Input, LoadingIcon } from "@repo/ui";

import { authClient } from "@/lib/auth-client";

/** Better Auth's own minimum; the server refuses anything shorter. */
const MIN_PASSWORD = 8;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    startTransition(async () => {
      const { error: failed } = await authClient.resetPassword({ newPassword: password, token });
      if (failed) {
        setError(
          failed.message ||
            "That link is no longer valid. Ask an owner to send a new one from the Team screen.",
        );
        return;
      }
      setDone(true);
      setPassword("");
      setConfirm("");
    });
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          Your password is set. Any other session on this account has been signed out.
        </p>
        <Button variant="brand" className="h-9 w-full" onClick={() => router.push("/login")}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="h-9"
          required
          autoFocus
        />
      </Field>
      <Field label="Repeat it">
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="h-9"
          required
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-danger/25 bg-danger/[0.07] px-2.5 py-2 text-base text-danger"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      <Button type="submit" variant="brand" className="h-9 w-full" disabled={pending} aria-busy={pending}>
        {pending && <LoadingIcon size="sm" />}
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
