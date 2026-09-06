"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const sessionExpired = searchParams.get("expired") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const { error: signInError } = await signIn.email({
          email,
          password,
          rememberMe,
        });

        if (!signInError) {
          router.push(redirect);
          router.refresh();
        } else {
          setError(signInError.message || "Invalid email or password. Please try again.");
        }
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
        <div className="plane p-5">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-base text-muted-foreground">
            This application holds every client, contract and payment record. Access is
            per person and every session is logged.
          </p>
          {sessionExpired && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2 text-base text-amber-600 dark:text-amber-400" role="alert">
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
            <div className="flex items-center justify-between text-base">
              <label className="flex cursor-pointer select-none items-center gap-2 text-muted-foreground">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
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
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
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
          <Loader2 className="size-4 animate-spin text-subtle-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}