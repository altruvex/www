"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, Reply, Send } from "lucide-react";

import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Textarea,
} from "@repo/ui";

import { DateField } from "@/components/os/date-field";
import {
  LEAD_TEMPLATES,
  leadFollowUpDraft,
  leadTemplateFor,
  type LeadTemplateId,
} from "@/lib/email-templates";
import { whatsappLink } from "@/lib/service-reminder";

const FIELD_LABEL = "telemetry block text-subtle-foreground";
const NEXT_FOLLOW_UP_DAYS = 7;

/** "YYYY-MM-DD" in the operator's own calendar, `days` from today. */
function dayFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface FollowUpLead {
  id: string;
  /** What the operator calls them (company, name or phone). */
  label: string;
  name: string | null;
  email: string | null;
  phone: string;
  /** Derived stage; picks the default draft. */
  stage: string | null;
}

/**
 * A follow-up a person sends: pick a draft, edit it, email it or send it from
 * their own WhatsApp and record it. Nothing here runs on a timer — the daily
 * sweep only raises the alert that brings someone to this sheet.
 */
export function FollowUpSheet({
  lead,
  emailConfigured,
  scheduleLink,
}: {
  lead: FollowUpLead;
  emailConfigured: boolean;
  scheduleLink: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [template, setTemplate] = React.useState<LeadTemplateId>(() => leadTemplateFor(lead.stage));
  const draft = React.useMemo(
    () => leadFollowUpDraft(template, { clientName: lead.name, scheduleLink }),
    [template, lead.name, scheduleLink],
  );
  const [subject, setSubject] = React.useState(draft.subject);
  const [body, setBody] = React.useState(draft.body);
  const [nextDay, setNextDay] = React.useState(() => dayFromToday(NEXT_FOLLOW_UP_DAYS));
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<"email" | "whatsapp-manual" | null>(null);
  const [openedWhatsApp, setOpenedWhatsApp] = React.useState(false);

  function pick(next: LeadTemplateId) {
    const fresh = leadFollowUpDraft(next, { clientName: lead.name, scheduleLink });
    setTemplate(next);
    setSubject(fresh.subject);
    setBody(fresh.body);
  }

  const emailBlocked = !lead.email
    ? "This lead has no email address on file."
    : !emailConfigured
      ? "No mail transport is configured (RESEND_API_KEY or SMTP)."
      : null;
  const waHref = whatsappLink(lead.phone, body);

  async function record(channel: "email" | "whatsapp-manual") {
    setBusy(channel);
    try {
      const res = await fetch(`/api/admin/clients/${lead.id}/follow-up`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          template,
          channel,
          subject,
          body,
          nextActionAt: nextDay || null,
          nextActionNote: nextDay ? note : null,
        }),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) {
        toast.error(data.message ?? "The follow-up could not be recorded.");
        return;
      }
      toast.success(
        channel === "email" ? `Follow-up emailed to ${lead.email}.` : "Recorded as sent on WhatsApp.",
      );
      setOpen(false);
      setOpenedWhatsApp(false);
      router.refresh();
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Reply className="size-3.5" />
          Send a follow-up
        </Button>
      </SheetTrigger>
      <SheetContent side="end" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Follow up with {lead.label}</SheetTitle>
          <SheetDescription>
            Pick a draft and edit it. Nothing is sent until you choose a channel below.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 overflow-y-auto p-4">
          <div className="space-y-1">
            <span className={FIELD_LABEL}>Draft</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Draft">
              {LEAD_TEMPLATES.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={template === option.id ? "brand" : "outline"}
                  aria-pressed={template === option.id}
                  onClick={() => pick(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <label className="block space-y-1">
            <span className={FIELD_LABEL}>Subject</span>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </label>
          <label className="block space-y-1">
            <span className={FIELD_LABEL}>Message</span>
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

          <section className="space-y-2 border-t border-border-subtle pt-3">
            <div className="space-y-1">
              <span className={FIELD_LABEL}>Next follow-up on</span>
              <DateField value={nextDay} onChange={setNextDay} ariaLabel="Next follow-up date" />
              {nextDay ? (
                <button
                  type="button"
                  className="text-meta text-muted-foreground hover:text-foreground hover:underline"
                  onClick={() => {
                    setNextDay("");
                    setNote("");
                  }}
                >
                  No next follow-up
                </button>
              ) : (
                <p className="text-meta text-subtle-foreground">
                  No date: no follow-up alert will be raised for this lead.
                </p>
              )}
            </div>
            {nextDay && (
              <label className="block space-y-1">
                <span className={FIELD_LABEL}>What to do then</span>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Check whether they read it"
                />
              </label>
            )}
          </section>

          <section className="space-y-2 border-t border-border-subtle pt-3">
            <p className="flex items-center gap-1.5 text-base font-medium">
              <Mail className="size-3.5 text-muted-foreground" aria-hidden />
              Email
            </p>
            <p className="text-meta text-subtle-foreground">
              {emailBlocked ?? `To ${lead.email}. Sent and recorded in the client's history.`}
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

          <section className="space-y-2 border-t border-border-subtle pt-3">
            <p className="flex items-center gap-1.5 text-base font-medium">
              <MessageCircle className="size-3.5 text-muted-foreground" aria-hidden />
              WhatsApp, from your phone
            </p>
            <p className="text-meta text-subtle-foreground">
              Opens WhatsApp with the message above filled in. Nothing is sent by this app — once
              you have sent it, record it so the lead shows they were contacted.
            </p>
            <div className="flex flex-wrap gap-2">
              {waHref ? (
                <Button asChild variant="outline">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpenedWhatsApp(true)}
                  >
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
