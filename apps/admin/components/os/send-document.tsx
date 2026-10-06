"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  Field,
  Input,
  SegmentedControl,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@repo/ui";

import { cn } from "@/lib/utils";

const WIDE_QUERY = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useWide() {
  return React.useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

type Channel = "email" | "whatsapp";

export function SendDocument({
  endpoint,
  defaultSubject,
  defaultBody,
  clientEmail,
  emailConfigured,
  whatsappConfigured,
  label = "Send",
  resend = false,
  variant = "brand",
  size,
  className,
}: {
  endpoint: string;
  defaultSubject: string;
  defaultBody: string;
  clientEmail: string | null;
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  label?: string;
  resend?: boolean;
  variant?: "brand" | "outline";
  size?: "sm";
  className?: string;
}) {
  const router = useRouter();
  const wide = useWide();
  const [open, setOpen] = React.useState(false);
  const canEmail = emailConfigured && Boolean(clientEmail);
  const [channel, setChannel] = React.useState<Channel>(
    canEmail || !whatsappConfigured ? "email" : "whatsapp",
  );
  const [subject, setSubject] = React.useState(defaultSubject);
  const [body, setBody] = React.useState(defaultBody);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  const blocked =
    channel === "email"
      ? !clientEmail
        ? "This client has no email address on file. Add one on the client record, or send over WhatsApp."
        : !emailConfigured
          ? "No mail transport is configured, so nothing can be emailed from here."
          : null
      : !whatsappConfigured
        ? "WhatsApp is not configured, so nothing can be sent over it."
        : null;

  async function send() {
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch(`${endpoint}?channel=${channel}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !data.success) {
        setFailure(
          `${data.message || `The request failed (${response.status}).`} Nothing was changed — you can retry safely.`,
        );
        return;
      }
      toast.success(
        data.message ||
          (channel === "email" ? `Emailed to ${clientEmail}` : "Sent over WhatsApp"),
      );
      setOpen(false);
      router.refresh();
    } catch {
      setFailure("The server could not be reached. Nothing was changed — you can retry safely.");
    } finally {
      setBusy(false);
    }
  }

  const title = resend ? `Resend ${label.replace(/^(Send|Resend)\s+/i, "")}` : label;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          setFailure(null);
          setOpen(true);
        }}
      >
        {resend ? <RotateCw className="size-3.5" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
        {resend ? "Resend" : label}
      </Button>

      <Sheet open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <SheetContent
          side={wide ? "end" : "bottom"}
          width="md"
          className={cn(!wide && "max-h-[92dvh] pb-[env(safe-area-inset-bottom)]")}
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {resend
                ? "It goes out again with a fresh link. Edit anything before it goes; the document link is added back if you remove it."
                : "Edit anything before it goes. The document link is added back if you remove it."}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <SegmentedControl<Channel>
                label="Channel"
                columns={2}
                value={channel}
                onChange={(next) => {
                  setChannel(next);
                  setFailure(null);
                }}
                options={[
                  { value: "email", label: "Email" },
                  { value: "whatsapp", label: "WhatsApp" },
                ]}
              />
              <p className="text-meta text-subtle-foreground">
                {channel === "email"
                  ? clientEmail
                    ? `To ${clientEmail}`
                    : "No address on file for this client."
                  : "Uses an approved WhatsApp template, so the wording below is not used."}
              </p>
            </div>

            {channel === "email" && (
              <>
                <Field label="Subject">
                  <Input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={200}
                    disabled={!canEmail || busy}
                  />
                </Field>
                <Field label="Message" hint="Plain text. It arrives as written.">
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={12}
                    maxLength={20000}
                    disabled={!canEmail || busy}
                    className="font-mono text-meta"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || (subject === defaultSubject && body === defaultBody)}
                  onClick={() => {
                    setSubject(defaultSubject);
                    setBody(defaultBody);
                  }}
                >
                  Reset to template
                </Button>
              </>
            )}

            {blocked && (
              <p className="rounded-ctl border border-border-subtle bg-surface px-3 py-2 text-meta text-warning" role="status">
                {blocked}
              </p>
            )}
            {failure && (
              <p className="rounded-ctl border border-danger/30 bg-danger/5 px-3 py-2 text-meta text-danger" role="alert">
                {failure}
              </p>
            )}
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={send}
              disabled={busy || blocked !== null}
              aria-busy={busy}
            >
              <Send className="size-3.5" aria-hidden />
              {busy ? "Sending…" : channel === "email" ? "Send email" : "Send over WhatsApp"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
