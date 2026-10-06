import { Link2Off, Mail, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import { AltruvexLogo, Button, Skeleton } from "@repo/ui";

import type { PortalContact } from "@/lib/client-portal";
import { phone as formatPhone } from "@/lib/format";

export type PortalKind = "project" | "maintenance";

const KIND_LABEL: Record<PortalKind, string> = {
  project: "Project portal",
  maintenance: "Maintenance portal",
};

export function whatsappLink(phoneNumber: string, text: string): string {
  return `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function PortalBrand({ kind }: { kind: PortalKind }) {
  return (
    <div className="flex items-center gap-2">
      <AltruvexLogo size="xs" variant="lockup" />
      <span className="telemetry ms-auto text-subtle-foreground">{KIND_LABEL[kind]}</span>
    </div>
  );
}

function PortalFrame({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 md:py-14">
      <PortalBrand kind={kind} />
      {children}
    </main>
  );
}

export function PortalShell({
  kind,
  title,
  subtitle,
  trailing,
  contact,
  contactSubject,
  children,
}: {
  kind: PortalKind;
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  contact: PortalContact;
  contactSubject: string;
  children: ReactNode;
}) {
  return (
    <PortalFrame kind={kind}>
      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-base text-muted-foreground">{subtitle}</p>}
        </div>
        {trailing && <div className="flex shrink-0 flex-wrap items-center gap-2">{trailing}</div>}
      </header>
      <div className="mt-6 space-y-4">{children}</div>
      <PortalFooter contact={contact} subject={contactSubject} />
    </PortalFrame>
  );
}

export function PortalFooter({ contact, subject }: { contact: PortalContact; subject: string }) {
  return (
    <footer className="mt-8 border-t border-border-subtle pt-5">
      <p className="text-base text-muted-foreground">
        Questions about this page? Message the team — a reply comes from a person, not a bot.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="lg" asChild>
          <a href={whatsappLink(contact.phone, subject)} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden />
            WhatsApp
          </a>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href={`mailto:${contact.email}?subject=${encodeURIComponent(subject)}`}>
            <Mail aria-hidden />
            Email
          </a>
        </Button>
      </div>
      <p className="telemetry mt-3 text-subtle-foreground">
        {formatPhone(contact.phone)} · {contact.email}
      </p>
    </footer>
  );
}

export function PortalInvalid({ kind, contact }: { kind: PortalKind; contact: PortalContact }) {
  return (
    <PortalFrame kind={kind}>
      <div className="plane mt-6 flex flex-col items-center px-6 py-10 text-center">
        <div className="mb-3 flex size-9 items-center justify-center rounded-ctl-lg border border-border-subtle bg-surface text-subtle-foreground">
          <Link2Off className="size-4" aria-hidden />
        </div>
        {/* brand-allow: hierarchy-multiple-h1 — separate render branch */}
        <h1 className="text-md font-semibold text-foreground">This link is not valid</h1>
        <p className="mt-1.5 max-w-md text-base text-muted-foreground">
          It may have been copied incompletely, or it is no longer active. Open the link exactly as
          it was sent to you, or ask the team for a fresh one.
        </p>
      </div>
      <PortalFooter contact={contact} subject={`My ${KIND_LABEL[kind].toLowerCase()} link is not working`} />
    </PortalFrame>
  );
}

export function PortalSkeleton({ kind }: { kind: PortalKind }) {
  return (
    <PortalFrame kind={kind}>
      <div className="mt-6 space-y-2" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="mt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="plane p-3">
            <Skeleton className="h-4 w-40" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-[var(--row-h)] w-full" />
              <Skeleton className="h-[var(--row-h)] w-full" />
            </div>
          </div>
        ))}
      </div>
    </PortalFrame>
  );
}
