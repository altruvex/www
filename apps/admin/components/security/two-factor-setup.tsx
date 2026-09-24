"use client";

import { Button, Field, Input, LoadingIcon } from "@repo/ui";
import { AlertCircle, Check, Copy, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { twoFactor } from "@/lib/auth-client";

type Stage = "idle" | "confirm" | "done";

/** The base32 secret an authenticator app needs, pulled out of the otpauth URI. */
function secretFrom(totpURI: string): string {
  try {
    return new URL(totpURI).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

/** Groups the key into fours so it can be read off the screen and typed. */
function readable(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function TwoFactorSetup({ enabled, required }: { enabled: boolean; required: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(enabled ? "done" : "idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { data, error: failed } = await twoFactor.enable({ password });
    setBusy(false);
    if (failed || !data) {
      setError(failed?.message || "That password was not accepted.");
      return;
    }
    setSecret(secretFrom(data.totpURI));
    setBackupCodes(data.backupCodes ?? []);
    setPassword("");
    setStage("confirm");
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { error: failed } = await twoFactor.verifyTotp({ code });
    setBusy(false);
    if (failed) {
      setError(failed.message || "That code is not correct. Check the clock on your phone and try again.");
      return;
    }
    setStage("done");
    router.refresh();
  }

  if (stage === "done") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-success/25 bg-success/[0.07] px-3 py-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <div className="text-base">
            <p className="font-medium text-foreground">Two-factor is on for this account.</p>
            <p className="text-muted-foreground">
              Signing in now asks for a six-digit code after your password.
            </p>
          </div>
        </div>
        {backupCodes.length > 0 && <BackupCodes codes={backupCodes} copied={copied} setCopied={setCopied} />}
        <Button variant="outline" onClick={() => router.push("/")}>
          Continue to the dashboard
        </Button>
      </div>
    );
  }

  if (stage === "confirm") {
    return (
      <form onSubmit={confirm} className="space-y-4">
        <div>
          <p className="text-base text-muted-foreground">
            Add this key to your authenticator app — 1Password, Authy, Google Authenticator — then
            type the code it shows.
          </p>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border-strong bg-muted/50 px-3 py-2.5">
            <code className="telemetry break-all text-foreground">{readable(secret)}</code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(secret).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
              aria-label="Copy the setup key"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="mt-1.5 text-meta text-muted-foreground">
            Account name: your email. Type: time-based (TOTP), six digits.
          </p>
        </div>

        <BackupCodes codes={backupCodes} copied={copied} setCopied={setCopied} />

        <Field label="Code from your app">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="h-9 tracking-[0.3em]"
            required
            autoFocus
          />
        </Field>

        {error && <Problem message={error} />}

        <Button type="submit" variant="brand" disabled={busy || code.length !== 6}>
          {busy && <LoadingIcon size="sm" />}
          {busy ? "Checking…" : "Turn on two-factor"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={start} className="space-y-4">
      <p className="text-base text-muted-foreground">
        {required
          ? "This account needs a second factor before it can reach the dashboard. Confirm your password to begin."
          : "Add a six-digit code to your sign-in. Confirm your password to begin."}
      </p>
      <Field label="Your password">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="h-9"
          required
          autoFocus
        />
      </Field>
      {error && <Problem message={error} />}
      <Button type="submit" variant="brand" disabled={busy || password.length === 0}>
        {busy && <LoadingIcon size="sm" />}
        {busy ? "Checking…" : "Begin setup"}
      </Button>
    </form>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-md border border-danger/25 bg-danger/[0.07] px-2.5 py-2 text-base text-danger"
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function BackupCodes({
  codes,
  copied,
  setCopied,
}: {
  codes: string[];
  copied: boolean;
  setCopied: (value: boolean) => void;
}) {
  if (codes.length === 0) return null;
  return (
    <div className="rounded-md border border-border-strong p-3">
      <p className="text-base font-medium text-foreground">Backup codes</p>
      <p className="mt-0.5 text-meta text-muted-foreground">
        Shown once. Each works one time, and they are the only way back in if the phone is lost.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {codes.map((backupCode) => (
          <code key={backupCode} className="telemetry text-foreground">
            {backupCode}
          </code>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2.5"
        onClick={() => {
          navigator.clipboard?.writeText(codes.join("\n")).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        {copied ? "Copied" : "Copy all"}
      </Button>
    </div>
  );
}
