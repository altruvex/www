"use client";

import { Button } from "@repo/ui";
import { LoadingIcon } from "@/components/loading-icon";
import { AlertCircle, CheckCircle2, Download, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface LineItem {
  name: string;
  amount: number;
}

interface SignContract {
  status: "DRAFT" | "SENT" | "SIGNED" | "DECLINED" | "EXPIRED";
  /** The link's own 30-day window, separate from the contract's status. */
  expired: boolean;
  fileUrl: string | null;
  signedAt: string | null;
  signedByName: string | null;
  client: { name: string | null; company: string | null };
  signer: {
    name: string | null;
    channels: { channel: "whatsapp" | "email"; hint: string }[];
  };
  proposal: {
    projectType: string;
    complexity: string;
    currency: string;
    totalPrice: number;
    lineItems: LineItem[];
    timelineWeeks: number;
    paymentSplit: { first: number; second: number; final: number };
    /** Present only when a discount was actually applied. */
    discount: { label: string; amount: number; subtotal: number } | null;
  };
  portalToken: string | null;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SignContractPage() {
  const params = useParams();
  const token = params.token as string;

  const [contract, setContract] = useState<SignContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [signedPortalToken, setSignedPortalToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState<"whatsapp" | "email" | null>(null);
  const [codeError, setCodeError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const requestCode = async (channel: "whatsapp" | "email") => {
    setSending(channel);
    setCodeError("");
    setError("");
    try {
      const response = await fetch(`/api/sign/${token}/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await response.json();
      if (data.success) {
        setSentTo(data.sentTo);
        setCode("");
        setResendIn(data.resendAfterSeconds ?? 60);
      } else {
        setCodeError(data.message || "The code could not be sent");
        if (data.retryAfterSeconds) setResendIn(data.retryAfterSeconds);
      }
    } catch {
      setCodeError("Something went wrong. Please try again.");
    } finally {
      setSending(null);
    }
  };

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sign/${token}`);
      const data = await response.json();
      if (data.success) {
        setContract(data.contract);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContract();
  }, [fetchContract]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code we sent you");
      return;
    }
    if (!name.trim() || !agreed) {
      setError("Enter your full name and confirm agreement to continue");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedByName: name, agreed: true, code: code.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setSignedPortalToken(data.portalToken);
      } else {
        setError(data.message || "Failed to sign contract");
        if (data.codeExpired) {
          setSentTo(null);
          setCode("");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingIcon size="lg" />
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Contract not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            This sign-in link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const alreadySigned = contract.status === "SIGNED" || signedPortalToken;
  const portalToken = signedPortalToken ?? contract.portalToken;

  // An old link and a lost contract are different facts, and a client reading
  // "not found" for the first one would reasonably think their agreement had
  // gone missing.
  if (!alreadySigned && contract.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md plane p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-foreground mb-2">This link has expired</h1>
          <p className="text-sm text-muted-foreground">
            Signing links stay open for 30 days after we send them. The agreement itself is
            unchanged — ask us to send it again and the new link will work straight away.
          </p>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md plane p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-foreground mb-2">Contract signed</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Thanks{(name || contract.signedByName) ? `, ${name || contract.signedByName}` : ""} —
            you&apos;ll hear from us on WhatsApp shortly with next steps.
          </p>
          {portalToken && (
            <Button variant="brand" className="w-full h-11" asChild>
              <a href={`/portal/${portalToken}`}>Track your project</a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg plane p-8 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Altruvex</p>
          <h1 className="text-2xl font-medium text-foreground">
            Project agreement — {contract.client.company || contract.client.name}
          </h1>
        </div>

        <div className="rounded-2xl bg-muted/50 p-5 space-y-2 text-sm">
          {contract.proposal.discount && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">List price</span>
                <span className="text-muted-foreground line-through">
                  {formatCurrency(
                    contract.proposal.discount.subtotal,
                    contract.proposal.currency,
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {contract.proposal.discount.label}
                </span>
                <span className="font-medium text-success">
                  −
                  {formatCurrency(
                    contract.proposal.discount.amount,
                    contract.proposal.currency,
                  )}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total investment</span>
            <span className="font-medium">
              {formatCurrency(contract.proposal.totalPrice, contract.proposal.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Timeline</span>
            <span className="font-medium">{contract.proposal.timelineWeeks} weeks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium">
              {contract.proposal.paymentSplit.first}% / {contract.proposal.paymentSplit.second}%
              {" "}/ {contract.proposal.paymentSplit.final}%
            </span>
          </div>
        </div>

        {contract.fileUrl && (
          <a
            href={contract.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand hover:underline"
          >
            <Download className="h-4 w-4" />
            Review the full agreement (.docx)
          </a>
        )}

        <div className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="text-muted-foreground">
            This agreement can only be signed by{" "}
            <span className="font-medium text-foreground">
              {contract.signer.name || "the person Altruvex designated"}
            </span>
            . To confirm it is you, we send a one-time code to your own WhatsApp or email.
          </p>
        </div>

        {contract.signer.channels.length === 0 ? (
          <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground" role="alert">
            There is no WhatsApp number or email on file to send your code to, so this agreement
            cannot be signed online yet. Contact Altruvex and we will set it up.
          </p>
        ) : (
          <form onSubmit={handleSign} className="space-y-4 pt-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {sentTo ? "Code sent" : "1. Get your verification code"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {contract.signer.channels.map((option) => (
                  <Button
                    key={option.channel}
                    type="button"
                    variant="outline"
                    className="h-auto justify-start rounded-xl px-4 py-3 text-start"
                    disabled={sending !== null || resendIn > 0}
                    aria-busy={sending === option.channel}
                    onClick={() => requestCode(option.channel)}
                  >
                    {option.channel === "whatsapp" ? (
                      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <Mail className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">
                        {sending === option.channel
                          ? "Sending…"
                          : `${sentTo ? "Resend" : "Send"} via ${option.channel === "whatsapp" ? "WhatsApp" : "email"}`}
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
              {sentTo && (
                <p className="text-sm text-muted-foreground" role="status">
                  We sent a 6-digit code to {sentTo}. It expires in 10 minutes.
                  {resendIn > 0 && ` You can request another in ${resendIn}s.`}
                </p>
              )}
              {codeError ? (
                <p className="text-sm text-destructive" role="alert">
                  {codeError}
                </p>
              ) : null}
            </div>

            {sentTo && (
              <>
                <div>
                  <label htmlFor="sign-code" className="text-sm font-medium mb-2 block">
                    2. Verification code
                  </label>
                  <input
                    id="sign-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sign-name" className="text-sm font-medium mb-2 block">
                    3. Full legal name
                  </label>
                  <input
                    id="sign-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Type your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
                    required
                  />
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-muted-foreground">
                    I have read the agreement above and agree to its terms on behalf of{" "}
                    {contract.client.company || contract.client.name}.
                  </span>
                </label>
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  variant="brand"
                  className="w-full h-11 rounded-xl"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? "Signing…" : "Sign agreement"}
                </Button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
