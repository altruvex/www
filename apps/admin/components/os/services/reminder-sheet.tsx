"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, Send } from "lucide-react";

import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@repo/ui";

import type { ServiceRow } from "@/lib/client-services";
import { date } from "@/lib/format";
import { reminderDraftFor, whatsappLink } from "@/lib/service-reminder";

/**
 * Reminding a client that a service renews.
 *
 * The wording is editable and pre-filled from the same draft the server falls
 * back to. Email is sent and recorded by the app. WhatsApp is handed to the
 * operator's own phone — the Business API has no renewal template — and only
 * recorded once they say they sent it, so the history never claims a message
 * this system did not send.
 */
export function ReminderSheet({
  service,
  emailConfigured,
  onClose,
}: {
  service: ServiceRow;
  emailConfigured: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const draft = React.useMemo(
    () =>
      reminderDraftFor({
        ...service,
        expiresAt: service.expiresAt ?? new Date().toISOString(),
        clientName: service.clientLabel,
      }),
    [service],
  );
  const [subject, setSubject] = React.useState(draft.subject);
  const [body, setBody] = React.useState(draft.body);
  const [busy, setBusy] = React.useState<"email" | "whatsapp-manual" | null>(null);
  const [openedWhatsApp, setOpenedWhatsApp] = React.useState(false);

  const emailBlocked = !service.clientEmail
    ? "This client has no email address on file."
    : !emailConfigured
      ? "No mail transport is configured (RESEND_API_KEY or SMTP)."
      : null;
  const waHref = whatsappLink(service.clientPhone, body);

  async function record(channel: "email" | "whatsapp-manual") {
    setBusy(channel);
    try {
      const res = await fetch(`/api/admin/services/${service.id}/remind`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel, subject, body }),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) {
        toast.error(data.message ?? "The reminder could not be recorded.");
        return;
      }
      toast.success(
        channel === "email"
          ? `Reminder emailed to ${service.clientEmail}.`
          : "Recorded as sent on WhatsApp.",
      );
      onClose();
      router.refresh();
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="end" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Remind {service.clientLabel}</SheetTitle>
          <SheetDescription>
            {service.name} renews on {service.expiresAt ? date(service.expiresAt) : "—"}. The
            contract promises the client a notice before each renewal date.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 overflow-y-auto p-4">
          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Subject</span>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </label>
          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Message</span>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={11}
              maxLength={20000}
              className="font-mono text-meta leading-relaxed"
            />
          </label>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubject(draft.subject);
                setBody(draft.body);
              }}
            >
              Reset to default
            </Button>
          </div>

          <section className="space-y-2 border-t border-border pt-3">
            <p className="flex items-center gap-1.5 text-base font-medium">
              <Mail className="size-3.5 text-muted-foreground" aria-hidden />
              Email
            </p>
            <p className="text-meta text-subtle-foreground">
              {emailBlocked ?? `To ${service.clientEmail}. Sent and recorded in the client's history.`}
            </p>
            <Button
              variant="brand"
              disabled={Boolean(emailBlocked) || busy !== null}
              onClick={() => record("email")}
            >
              <Send className="size-3.5" />
              {busy === "email" ? "Sending…" : "Send email"}
            </Button>
          </section>

          <section className="space-y-2 border-t border-border pt-3">
            <p className="flex items-center gap-1.5 text-base font-medium">
              <MessageCircle className="size-3.5 text-muted-foreground" aria-hidden />
              WhatsApp, from your phone
            </p>
            <p className="text-meta text-subtle-foreground">
              Opens WhatsApp with the message above filled in. Nothing is sent by this app — once
              you have sent it, record it so the service shows the client was told.
            </p>
            <div className="flex flex-wrap gap-2">
              {waHref ? (
                <Button asChild variant="outline">
                  <a href={waHref} target="_blank" rel="noreferrer" onClick={() => setOpenedWhatsApp(true)}>
                    Open in WhatsApp
                  </a>
                </Button>
              ) : (
                <span className="text-meta text-warning">No usable phone number on file.</span>
              )}
              <Button
                variant={openedWhatsApp ? "brand" : "ghost"}
                disabled={busy !== null}
                onClick={() => record("whatsapp-manual")}
              >
                {busy === "whatsapp-manual" ? "Recording…" : "I sent it on WhatsApp"}
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
