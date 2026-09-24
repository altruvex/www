"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Box,
  Globe,
  KeyRound,
  Mail,
  MoreHorizontal,
  Plus,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import type { ClientServiceKind } from "@repo/database";

import { DeleteRecordButton } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import type { ServiceRow } from "@/lib/client-services";
import { date, money } from "@/lib/format";
import {
  expiryPhrase,
  KIND_LABEL,
  needsAttention,
  nextExpiry,
  perTermLabel,
} from "@/lib/service-lifecycle";
import { statusOf, toneText } from "@/lib/status";
import { cn } from "@/lib/utils";

import { ReminderSheet } from "./reminder-sheet";
import {
  ActivateServiceSheet,
  billingDescription,
  sendServiceRequest,
  ServiceSheet,
  type ServiceScope,
} from "./service-sheet";

const KIND_ICON: Record<ClientServiceKind, LucideIcon> = {
  DOMAIN: Globe,
  HOSTING: Server,
  BUSINESS_EMAIL: Mail,
  SSL_CERTIFICATE: ShieldCheck,
  SOFTWARE_LICENSE: KeyRound,
  OTHER: Box,
};

type Overlay =
  | { type: "create" }
  | { type: "edit"; service: ServiceRow }
  | { type: "activate"; service: ServiceRow }
  | { type: "remind"; service: ServiceRow }
  | null;

/**
 * The services list, used on a project, on a client and on /services.
 *
 * Each row answers three questions in reading order: what is it, what does the
 * client pay for it, and when does it run out. The state is a word as well as
 * a colour, and the countdown is a phrase as well as a date, so neither depends
 * on seeing the tint.
 *
 * `scopeFor` decides whether this list can create and edit: /services lists
 * every client's services and edits them in their own client's scope.
 */
export function ServicesList({
  services,
  title = "Services",
  description,
  createScope,
  scopes,
  showClient = false,
  showProject = false,
  emailConfigured = false,
  emptyText,
}: {
  services: ServiceRow[];
  title?: string;
  description?: string;
  /** When present, the panel offers "Add service" in this scope. */
  createScope?: ServiceScope;
  /** Scope per client id, for editing rows. Falls back to `createScope`. */
  scopes?: Record<string, ServiceScope>;
  showClient?: boolean;
  showProject?: boolean;
  /** Whether a mail transport exists, for the reminder sheet. */
  emailConfigured?: boolean;
  emptyText?: React.ReactNode;
}) {
  const router = useRouter();
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const scopeFor = (service: ServiceRow): ServiceScope =>
    scopes?.[service.clientId] ??
    createScope ?? {
      clientId: service.clientId,
      projects: service.projectId ? [{ id: service.projectId, name: service.projectName ?? "Project" }] : [],
      products: service.productId ? [{ id: service.productId, name: service.productName ?? "Product" }] : [],
      currency: service.currency,
    };

  async function act(service: ServiceRow, body: Record<string, unknown>, success: string) {
    setBusy(service.id);
    const saved = await sendServiceRequest(router, "PATCH", { id: service.id, ...body });
    setBusy(null);
    if (!saved) return;
    toast.success(success, { description: billingDescription(saved) });
    router.refresh();
  }

  return (
    <>
      <Panel
        title={title}
        description={description}
        flush
        action={
          createScope ? (
            <Button variant="outline" size="sm" onClick={() => setOverlay({ type: "create" })}>
              <Plus className="size-3.5" />
              Add service
            </Button>
          ) : undefined
        }
      >
        {services.length === 0 ? (
          <EmptyInline
            action={
              createScope ? (
                <Button variant="outline" size="sm" onClick={() => setOverlay({ type: "create" })}>
                  <Plus className="size-3.5" />
                  Add the first service
                </Button>
              ) : undefined
            }
          >
            {emptyText ??
              "Nothing recorded. Add the domain, hosting and mailboxes this client holds through us — each one counts down to its expiry and raises an alert before it lapses."}
          </EmptyInline>
        ) : (
          <ul className="divide-y divide-border">
            {services.map((service) => {
              const Icon = KIND_ICON[service.kind];
              const state = statusOf("clientServiceState", service.state);
              const expires = service.expiresAt ? new Date(service.expiresAt) : null;
              const isBusy = busy === service.id;
              const dimmed = service.status === "CANCELLED";
              return (
                <li
                  key={service.id}
                  id={`service-${service.id}`}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:flex-nowrap",
                    isBusy && "opacity-60",
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", dimmed ? "text-subtle-foreground" : "text-muted-foreground")}
                    aria-hidden
                  />

                  <div className="min-w-0 flex-1 basis-48">
                    <p className="flex min-w-0 items-baseline gap-2">
                      <span
                        className={cn(
                          "truncate text-base font-medium",
                          service.kind === "DOMAIN" && "font-mono",
                          dimmed && "text-muted-foreground line-through decoration-border-mid",
                        )}
                      >
                        {service.name}
                      </span>
                      <span className="telemetry shrink-0 text-subtle-foreground">
                        {KIND_LABEL[service.kind]}
                      </span>
                    </p>
                    <p className="truncate text-meta text-muted-foreground">
                      {[
                        service.provider,
                        showClient ? service.clientLabel : null,
                        showProject ? service.projectName : null,
                        service.productName && !showProject ? service.productName : null,
                        service.autoRenew ? "auto-renews at provider" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No provider recorded"}
                    </p>
                  </div>

                  {/* Price: what the client owes per term. */}
                  <div className="shrink-0 text-end sm:w-40">
                    <p className="font-mono text-base tabular-nums">
                      {money(service.price, service.currency)}
                      <span className="ms-1 text-meta text-subtle-foreground">
                        {perTermLabel(service.termMonths)}
                      </span>
                    </p>
                    <p className="text-meta text-subtle-foreground">
                      {service.firstTermIncluded ? "first term in project fee" : "billed separately"}
                    </p>
                  </div>

                  {/* Expiry: the date, and what it means today. */}
                  <div className="shrink-0 sm:w-44 sm:text-end">
                    <StatusPill registry="clientServiceState" value={service.state} />
                    <p
                      className={cn(
                        "mt-1 font-mono text-meta tabular-nums",
                        expires && !dimmed ? toneText[state.tone] : "text-subtle-foreground",
                      )}
                    >
                      {expires
                        ? dimmed
                          ? `was due ${date(expires)}`
                          : `${date(expires)} · ${expiryPhrase(expires)}`
                        : "no expiry until registered"}
                    </p>
                    {/* Only once there is something to be told about. */}
                    {service.status === "ACTIVE" && needsAttention(service.state) && (
                      <p
                        className={cn(
                          "text-meta",
                          service.reminded ? "text-subtle-foreground" : "text-warning",
                        )}
                      >
                        {service.reminded && service.reminderSentAt
                          ? `client reminded ${date(service.reminderSentAt)}`
                          : "client not reminded"}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {service.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => setOverlay({ type: "activate", service })}
                      >
                        Mark registered
                      </Button>
                    )}
                    {service.status === "ACTIVE" && needsAttention(service.state) && !service.reminded && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => setOverlay({ type: "remind", service })}
                      >
                        Remind client
                      </Button>
                    )}
                    {service.status === "ACTIVE" &&
                      needsAttention(service.state) &&
                      service.reminded && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() =>
                            act(
                              service,
                              { action: "renew" },
                              `Renewed until ${date(nextExpiry({ expiresAt: expires, termMonths: service.termMonths }))}.`,
                            )
                          }
                        >
                          {isBusy ? "Working…" : "Mark renewed"}
                        </Button>
                      )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${service.name}`}>
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setOverlay({ type: "edit", service })}>
                          Edit
                        </DropdownMenuItem>
                        {service.status === "ACTIVE" && (
                          <DropdownMenuItem
                            onSelect={() =>
                              act(
                                service,
                                { action: "renew" },
                                `Renewed until ${date(nextExpiry({ expiresAt: expires, termMonths: service.termMonths }))}.`,
                              )
                            }
                          >
                            Mark renewed — next term
                          </DropdownMenuItem>
                        )}
                        {service.status === "ACTIVE" && service.expiresAt && (
                          <DropdownMenuItem onSelect={() => setOverlay({ type: "remind", service })}>
                            {service.reminded ? "Remind client again…" : "Remind client…"}
                          </DropdownMenuItem>
                        )}
                        {service.kind === "DOMAIN" && service.status !== "PENDING" && (
                          <DropdownMenuItem
                            onSelect={() =>
                              act(service, { action: "sync-registry" }, `${service.name}: expiry read from the registry.`)
                            }
                          >
                            Read expiry from registry
                          </DropdownMenuItem>
                        )}
                        {showClient && (
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${service.clientId}?tab=services`}>Open client</Link>
                          </DropdownMenuItem>
                        )}
                        {service.projectId && !showProject && (
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${service.projectId}?tab=services`}>Open project</Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {service.status === "CANCELLED" ? (
                          <DropdownMenuItem
                            onSelect={() => act(service, { action: "reactivate" }, `${service.name} reactivated.`)}
                          >
                            Reactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() =>
                              act(service, { action: "cancel" }, `${service.name} cancelled — no more renewal alerts.`)
                            }
                          >
                            Cancel service
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DeleteRecordButton entity="clientService" id={service.id} label={service.name} size="icon-sm">
                      {null}
                    </DeleteRecordButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {overlay?.type === "create" && createScope && (
        <ServiceSheet scope={createScope} onClose={() => setOverlay(null)} />
      )}
      {overlay?.type === "edit" && (
        <ServiceSheet
          scope={scopeFor(overlay.service)}
          service={overlay.service}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.type === "remind" && (
        <ReminderSheet
          service={overlay.service}
          emailConfigured={emailConfigured}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.type === "activate" && (
        <ActivateServiceSheet service={overlay.service} onClose={() => setOverlay(null)} />
      )}
    </>
  );
}
