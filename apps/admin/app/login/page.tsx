"use client";

import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore, useTransition } from "react";

import { Button, Checkbox, Field, Input, LoadingIcon } from "@repo/ui";

import { signIn, twoFactor } from "@/lib/auth-client";
import {
  getRememberMe,
  getServerRememberMe,
  setRememberMe,
  subscribeRememberMe,
} from "@/lib/remember-me";
import { safeRedirectPath } from "@/lib/safe-redirect";

import { AuthNotice, AuthShell, authControl } from "./auth-shell";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const rememberMe = useSyncExternalStore(
    subscribeRememberMe,
    getRememberMe,
    getServerRememberMe,
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const codeReady = useBackup ? code.length >= 8 : code.length === 6;

  const handleRememberMeChange = (checked: boolean | "indeterminate") => {
    setRememberMe(checked === true);
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect"));
  const sessionExpired = searchParams.get("expired") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const { data, error: signInError } = await signIn.email({
          email,
          password,
          rememberMe,
        });

        if (signInError) {
          setError(signInError.message || "Invalid email or password. Please try again.");
          return;
        }

        if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
          setNeedsCode(true);
          return;
        }

        router.push(redirect);
        router.refresh();
      } catch {
        setError("The sign-in service did not respond. Please try again later.");
      }
    });
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const { error: verifyError } = useBackup
          ? await twoFactor.verifyBackupCode({ code })
          : await twoFactor.verifyTotp({ code });
        if (verifyError) {
          setError(
            verifyError.message ||
              (useBackup
                ? "That backup code is not correct, or it has already been used."
                : "That code is not correct. Check the clock on your phone and try again."),
          );
          return;
        }
        router.push(redirect);
        router.refresh();
      } catch {
        setError("The sign-in service did not respond. Please try again later.");
      }
    });
  };

  const backToPassword = () => {
    setNeedsCode(false);
    setUseBackup(false);
    setCode("");
    setPassword("");
    setError("");
  };

  const helpLine = (
    <p className="flex items-start gap-2">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      Accounts are created by an owner — there is no sign-up. If you cannot get in, ask for an
      account rather than resetting one.
    </p>
  );

  if (needsCode) {
    return (
      <AuthShell
        label="Operating system"
        title="Enter your code"
        lead={
          useBackup
            ? "Your password was accepted. Type one of the backup codes you saved when you set up two-factor. Each works once."
            : "Your password was accepted. Type the six-digit code from your authenticator app."
        }
        footer={
          <button
            type="button"
            onClick={backToPassword}
            className="inline-flex min-h-8 items-center gap-1.5 underline underline-offset-2 hover:text-foreground pointer-coarse:min-h-11"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to sign in
          </button>
        }
      >
        <form onSubmit={handleCode} className="space-y-3">
          {useBackup ? (
            <Field label="Backup code">
              <Input
                name="backup-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 24))}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="xxxxx-xxxxx"
                className={authControl}
                autoFocus
                required
              />
            </Field>
          ) : (
            <Field label="Six-digit code">
              <Input
                name="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                placeholder="000000"
                className={`${authControl} tracking-[0.3em]`}
                autoFocus
                required
              />
            </Field>
          )}
          <div aria-live="polite">{error && <AuthNotice tone="danger">{error}</AuthNotice>}</div>
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={isPending || !codeReady}
            aria-busy={isPending}
          >
            {isPending && <LoadingIcon size="sm" />}
            {isPending ? "Verifying…" : "Verify and sign in"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              setUseBackup((value) => !value);
              setCode("");
              setError("");
            }}
          >
            {useBackup ? "Use the authenticator app instead" : "Lost the phone? Use a backup code"}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      label="Operating system"
      title="Sign in"
      lead="This application holds every client, contract and payment record. Access is per person and every session is logged."
      footer={helpLine}
    >
      {sessionExpired && (
        <AuthNotice tone="warning" className="mb-4">
          Your session has expired. Please sign in again.
        </AuthNotice>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Email">
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@altruvex.com"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            className={authControl}
            autoFocus
            required
          />
        </Field>
        <Field label="Password">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              className={`${authControl} pe-10`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 rounded-e-full pointer-coarse:w-11"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>
        <div className="flex min-h-8 items-center gap-2 text-base pointer-coarse:min-h-11">
          <Checkbox
            id="remember-me"
            name="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => handleRememberMeChange(checked === true)}
          />
          <label
            htmlFor="remember-me"
            className="cursor-pointer select-none text-muted-foreground transition-colors hover:text-foreground"
          >
            Remember me
          </label>
        </div>
        <div aria-live="polite">{error && <AuthNotice tone="danger">{error}</AuthNotice>}</div>
        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending && <LoadingIcon size="sm" />}
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <LoadingIcon size="lg" className="text-subtle-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
