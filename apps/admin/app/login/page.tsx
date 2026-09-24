"use client";

import { Button } from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import { Field, Input } from "@repo/ui";
import { signIn, twoFactor } from "@/lib/auth-client";
import {
  getRememberMe,
  getServerRememberMe,
  setRememberMe,
  subscribeRememberMe,
} from "@/lib/remember-me";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore, useTransition } from "react";
import { Checkbox } from "@repo/ui";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Read through `useSyncExternalStore` so the server's value survives
  // hydration and the stored one is applied straight after — see lib/remember-me.ts.
  const rememberMe = useSyncExternalStore(
    subscribeRememberMe,
    getRememberMe,
    getServerRememberMe,
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  // Better Auth answers a password sign-in with `twoFactorRedirect` when the
  // account carries a second factor; no session exists until the code verifies.
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");

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
        const { error: verifyError } = await twoFactor.verifyTotp({ code });
        if (verifyError) {
          setError(
            verifyError.message ||
              "That code is not correct. Check the clock on your phone and try again.",
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

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-95">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-foreground font-sans text-meta font-semibold text-background">
            A
          </span>
          <span className="font-sans text-md font-semibold tracking-tight">Altruvex</span>
          <span className="telemetry ms-auto text-subtle-foreground">Operating system</span>
        </div>
        {needsCode ? (
          <div className="plane p-5">
            <h1 className="text-lg font-semibold">Enter your code</h1>
            <p className="mt-1 text-base text-muted-foreground">
              Your password was accepted. Type the six-digit code from your authenticator app, or
              one of your backup codes.
            </p>
            <form onSubmit={handleCode} className="mt-5 space-y-3">
              <Field label="Six-digit code">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="h-9 tracking-[0.3em]"
                  autoFocus
                  required
                />
              </Field>
              {error && (
                <p
                  className="rounded-md border border-danger/25 bg-danger/[0.07] px-2.5 py-2 text-base text-danger"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                variant="brand"
                className="h-9 w-full"
                disabled={isPending || code.length !== 6}
                aria-busy={isPending}
              >
                {isPending && <LoadingIcon size="sm" />}
                {isPending ? "Verifying…" : "Verify and sign in"}
              </Button>
            </form>
          </div>
        ) : (
        <div className="plane p-5">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-base text-muted-foreground">
            This application holds every client, contract and payment record. Access is
            per person and every session is logged.
          </p>
          {sessionExpired && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-warning/25 bg-warning/[0.07] px-2.5 py-2 text-base text-warning" role="alert">
              <AlertCircle className="size-4 shrink-0" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@altruvex.com"
                autoComplete="username"
                className="h-9"
                autoFocus
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Type Your Password"
                  autoComplete="current-password"
                  className="h-9 pe-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </Field>
            <div className="flex items-center gap-2 text-base">
              <Checkbox
                id="remember-me"
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
            {error && (
              <p
                className="rounded-md border border-danger/25 bg-danger/[0.07] px-2.5 py-2 text-base text-danger"
                role="alert"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="brand"
              className="h-9 w-full"
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending && <LoadingIcon size="sm" />}
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        )}
        <p className="mt-3 flex items-start gap-2 text-meta text-subtle-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Accounts are created by an owner — there is no sign-up. If you cannot get in,
          ask for an account rather than resetting one.
        </p>
      </div>
    </main>
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