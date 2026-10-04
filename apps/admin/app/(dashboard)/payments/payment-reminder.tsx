"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing, Mail, MessageCircle, Send } from "lucide-react";

import {
  Button,
  Field,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@repo/ui";

import { dueLabel } from "@/lib/format";
import type { PaymentReminderTarget } from "@/lib/payment-reminder";
import { whatsappLink } from "@/lib/service-reminder";

export function PaymentReminderButton({
  target,
  emailConfigured,
}: {
  target: PaymentReminderTarget;
  emailConfigured: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  if (!target.unpaid || !target.client) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-xs underline-offset-2 hover:underline"
      >
        <BellRing className="size-3.5" aria-hidden />
        Send reminder
      </button>
      {open && (
        <PaymentReminderSheet target={target} emailConfigured={emailConfigured} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function PaymentReminderSheet({
  target,
  emailConfigured,
  onClose,
}: {
  target: PaymentReminderTarget;
  emailConfigured: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const client = target.client!;
  const clientLabel = client.company || client.name || "this client";
  const [subject, setSubject] = React.useState(target.draft.subject);
  const [body, setBody] = React.useState(target.draft.body);
  const [busy, setBusy] = React.useState<"email" | "whatsapp-manual" | null>(null);
  const [openedWhatsApp, setOpenedWhatsApp] = React.useState(false);

  const emailBlocked = !client.email
    ? "This client has no email address on file."
    : !emailConfigured
      ? "No mail transport is configured (RESEND_API_KEY or SMTP). Nothing will be sent."
      : null;
  const waHref = whatsappLink(client.phone, body);

  async function record(channel: "email" | "whatsapp-manual") {
    setBusy(channel);
    try {
      const res = await fetch(`/api/admin/payments/${target.paymentId}/remind`, {
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
        toast.error(data.message ?? "The reminder could not be sent.");
        return;
      }
      toast.success(channel === "email" ? `Reminder emailed to ${client.email}.` : "Recorded as sent on WhatsApp.");
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
          <SheetTitle>Remind {clientLabel}</SheetTitle>
          <SheetDescription>
            {target.amountLabel} for {target.label}
            {target.invoiceNumber ? ` (${target.invoiceNumber})` : ""}
            {target.dueDate ? ` — ${dueLabel(target.dueDate)}` : ""}. Review the wording; nothing goes out until
            you send it.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 overflow-y-auto p-4">
          <Field label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </Field>
          <Field label="Message">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={11}
              maxLength={20000}
              className="font-mono text-meta leading-relaxed"
            />
          </Field>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubject(target.draft.subject);
                setBody(target.draft.body);
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
              {emailBlocked ??
                `To ${client.email}. Sent and recorded in the client's history${
                  target.link ? "; the portal link is added back if you remove it" : ""
                }.`}
            </p>
            <Button variant="brand" disabled={Boolean(emailBlocked) || busy !== null} onClick={() => record("email")}>
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
              Opens WhatsApp with the message above filled in. Nothing is sent by this app — once you have sent
              it, record it so the payment&apos;s history shows the client was reminded.
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
