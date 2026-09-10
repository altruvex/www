"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { Button, Input } from "@repo/ui";

import { Panel } from "@/components/os/panel";
import { cn } from "@/lib/utils";

/**
 * Sending a proposal or a contract to a client (§26).
 *
 * Two things this screen exists for, and neither is decoration:
 *
 * - **The channel is a choice.** WhatsApp needs a verified business, a
 *   registered number and a payment method; email needs none of them. Which one
 *   works is a fact about the day, not about the document.
 * - **The wording is editable.** The default is a shortcut, not a script. The
 *   difference between "your proposal is ready" and "as we discussed, I moved
 *   QA a week earlier" is the difference between a notification and somebody
 *   following up on a deal.
 *
 * The link is guaranteed server-side. An operator rewriting the note above it
 * can delete it without noticing, and a proposal email with no proposal in it
 * looks entirely normal as it is sent.
 */
export function SendDocument({
  endpoint,
  defaultSubject,
  defaultBody,
  clientEmail,
  emailConfigured,
  whatsappConfigured,
  label = "Send",
}: {
  endpoint: string;
  defaultSubject: string;
  defaultBody: string;
  clientEmail: string | null;
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  // Email first when it is the one that can actually deliver today.
  const [channel, setChannel] = React.useState<"email" | "whatsapp">(
    emailConfigured && clientEmail ? "email" : "whatsapp",
  );
  const [subject, setSubject] = React.useState(defaultSubject);
  const [body, setBody] = React.useState(defaultBody);
  const [busy, setBusy] = React.useState(false);

  const canEmail = emailConfigured && Boolean(clientEmail);
  const blocked =
    channel === "email"
      ? !clientEmail
        ? "This client has no email address on file."
        : !emailConfigured
          ? "No mail transport is configured."
          : null
      : !whatsappConfigured
        ? "WhatsApp is not configured, so nothing can be sent over it."
        : null;

  async function send() {
    setBusy(true);
    try {
      const response = await fetch(`${endpoint}?channel=${channel}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Sent for both channels; the WhatsApp path ignores it, and posting one
        // shape from one button is less to get wrong than two.
        body: JSON.stringify({ subject, body }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }
      toast.success(channel === "email" ? `Sent to ${clientEmail}` : "Sent over WhatsApp");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Sending failed", {
        description:
          error instanceof Error
            ? `${error.message} Nothing was changed — you can retry safely.`
            : "Unknown error. Nothing was changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Send className="size-3.5" />
        {label}
      </Button>
    );
  }

  return (
    <Panel
      title={label}
      description="Edit anything here before it goes. The document link is added back if you remove it."
      className="w-full"
      flush
    >
      <div className="space-y-3 p-3">
        <div>
          <p className="telemetry text-subtle-foreground">Channel</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={channel === "email" ? "outline" : "ghost"}
              onClick={() => setChannel("email")}
            >
              <Mail className="size-3.5" />
              Email
            </Button>
            <Button
              type="button"
              size="sm"
              variant={channel === "whatsapp" ? "outline" : "ghost"}
              onClick={() => setChannel("whatsapp")}
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </Button>
          </div>
          <p className="mt-1 text-meta text-subtle-foreground">
            {channel === "email"
              ? clientEmail
                ? `To ${clientEmail}`
                : "No address on file for this client."
              : "Uses an approved WhatsApp template, so the wording below is not used."}
          </p>
        </div>

        {channel === "email" && (
          <>
            <label className="block space-y-1">
              <span className="telemetry block text-subtle-foreground">Subject</span>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={200}
                disabled={!canEmail}
              />
            </label>

            <label className="block space-y-1">
              <span className="telemetry block text-subtle-foreground">Message</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={12}
                maxLength={20000}
                disabled={!canEmail}
                className={cn(
                  "w-full rounded-ctl border border-border bg-background px-3 py-2 font-mono text-meta leading-relaxed",
                  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "disabled:opacity-50",
                )}
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <p className="text-meta text-subtle-foreground">
                Plain text. It arrives as written.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubject(defaultSubject);
                  setBody(defaultBody);
                }}
              >
                Reset to default
              </Button>
            </div>
          </>
        )}

        {blocked && <p className="text-meta text-warning">{blocked}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="brand" onClick={send} disabled={busy || blocked !== null}>
            <Send className="size-3.5" />
            {busy ? "Sending…" : channel === "email" ? "Send email" : "Send over WhatsApp"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
