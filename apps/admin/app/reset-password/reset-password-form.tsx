"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Input, LoadingIcon } from "@repo/ui";

import { AuthNotice, authControl } from "@/app/login/auth-shell";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD = 8;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && confirm !== password;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

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
        <AuthNotice tone="success">
          Your password is set. Any other session on this account has been signed out.
        </AuthNotice>
        <Button variant="brand" size="lg" className="w-full" onClick={() => router.push("/login")}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field
        label="New password"
        hint={tooShort ? undefined : `At least ${MIN_PASSWORD} characters.`}
        error={tooShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
      >
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            name="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            className={`${authControl} pe-10`}
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            className="absolute inset-y-0 end-0 flex w-9 items-center justify-center rounded-e-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 pointer-coarse:w-11"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </Field>
      <Field label="Repeat it" error={mismatch ? "The two passwords do not match." : undefined}>
        <Input
          type={show ? "text" : "password"}
          name="confirm-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          className={authControl}
          required
        />
      </Field>
      <div aria-live="polite">{error && <AuthNotice tone="danger">{error}</AuthNotice>}</div>
      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="w-full"
        disabled={pending}
        aria-busy={pending}
      >
        {pending && <LoadingIcon size="sm" />}
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
