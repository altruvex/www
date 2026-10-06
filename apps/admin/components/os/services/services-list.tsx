"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  Box,
  Globe,
  KeyRound,
  Mail,
  MoreHorizontal,
  Plus,
  Receipt,
  RotateCcw,
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

import { ConfirmDialog, type ConfirmResult } from "@/components/os/confirm-dialog";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { inspectHref } from "@/components/os/inspect-sheet";
import { useRowOpen } from "@/components/os/row-open";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import type { ServiceScreenRow } from "@/lib/client-services";
import { date, money } from "@/lib/format";
import {
  expiryPhrase,
  isOneTime,
  KIND_LABEL,
  needsAttention,
  nextExpiry,
  perTermLabel,
  renewRefusal,
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

const FINANCE_ONLY = "Finance only";

type Overlay =
  | { type: "create" }
  | { type: "edit"; service: ServiceScreenRow }
  | { type: "activate"; service: ServiceScreenRow }
  | { type: "remind"; service: ServiceScreenRow }
  | null;

type Confirm = { type: "renew" | "cancel"; service: ServiceScreenRow } | null;

function renewable(service: ServiceScreenRow): boolean {
  return (
    renewRefusal({
      status: service.status,
      expiresAt: service.expiresAt ? new Date(service.expiresAt) : null,
      termMonths: service.termMonths,
    }) === null
  );
}

function renewalDate(service: ServiceScreenRow): Date | null {
  if (service.termMonths === null) return null;
  return nextExpiry({
    expiresAt: service.expiresAt ? new Date(service.expiresAt) : null,
    termMonths: service.termMonths,
  });
}

function renewConsequence(service: ServiceScreenRow, showMoney: boolean, next: Date): string {
  const until = `Expiry moves to ${date(next)}, anchored to the current expiry.`;
  const term = perTermLabel(service.termMonths);
  if (!service.projectId) {
    return `${until} No payment opens: the service is not on a project — record ${
      showMoney ? `${money(service.price, service.currency)} ${term}` : "the term"
    } on the payments screen.`;
  }
  return `${until} Opens a pending payment of ${
    showMoney ? `${money(service.price, service.currency)} ${term}` : "the term's price"
  } on the project when the project bills in ${service.currency}.`;
}

async function runServiceAction(
  router: ReturnType<typeof useRouter>,
  service: ServiceScreenRow,
  body: Record<string, unknown>,
  success: string,
): Promise<ConfirmResult> {
  const saved = await sendServiceRequest(router, "PATCH", { id: service.id, ...body });
  if (!saved) return { ok: false, message: "Not saved. See the message above, then try again or cancel." };
  router.refresh();
  const detail = billingDescription(saved);
  return { ok: true, message: detail ? `${success} ${detail}` : success };
}

async function runQuickAction(
  router: ReturnType<typeof useRouter>,
  service: ServiceScreenRow,
  body: Record<string, unknown>,
  success: string,
): Promise<boolean> {
  const saved = await sendServiceRequest(router, "PATCH", { id: service.id, ...body });
  if (!saved) return false;
  toast.success(success, { description: billingDescription(saved) });
  router.refresh();
  return true;
}

function ServiceConfirm({
  confirm,
  showMoney,
  onClose,
}: {
  confirm: Confirm;
  showMoney: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!confirm) return null;
  const { service } = confirm;
  if (confirm.type === "renew") {
    const next = renewalDate(service);
    if (!next) return null;
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={`Mark ${service.name} renewed`}
        body={`${KIND_LABEL[service.kind]} · ${service.clientLabel}${
          service.expiresAt ? ` · expires ${date(service.expiresAt)}` : ""
        }`}
        consequence={renewConsequence(service, showMoney, next)}
        confirmLabel="Mark renewed"
        onConfirm={() => runServiceAction(router, service, { action: "renew" }, `Renewed until ${date(next)}.`)}
      />
    );
  }
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Cancel ${service.name}`}
      body={`${KIND_LABEL[service.kind]} · ${service.clientLabel}`}
      consequence="Stops renewal alerts and client reminders for this service. The record and any payment already opened stay; it can be reactivated later."
      confirmLabel="Cancel service"
      cancelLabel="Keep it"
      tone="danger"
      onConfirm={() =>
        runServiceAction(router, service, { action: "cancel" }, `${service.name} cancelled — no more renewal alerts.`)
      }
    />
  );
}

export function ServiceInspectorActions({
  service,
  showMoney = false,
  canManage,
  canRemind,
  emailConfigured = false,
  termPaymentId = null,
}: {
  service: ServiceScreenRow;
  showMoney?: boolean;
  canManage: boolean;
  canRemind: boolean;
  emailConfigured?: boolean;
  termPaymentId?: string | null;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState<Confirm>(null);
  const [remind, setRemind] = React.useState(false);
  const [activating, setActivating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canManage && service.status === "PENDING" && (
          <Button size="sm" variant="brand" onClick={() => setActivating(true)}>
            <BadgeCheck className="size-3.5" aria-hidden />
            Mark registered
          </Button>
        )}
        {canManage && service.status === "CANCELLED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await runQuickAction(router, service, { action: "reactivate" }, `${service.name} reactivated.`);
              setBusy(false);
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reactivate
          </Button>
        )}
        {canManage && renewable(service) && (
          <Button size="sm" variant="brand" onClick={() => setConfirm({ type: "renew", service })}>
            Mark renewed
          </Button>
        )}
        {canRemind && renewable(service) && (
          <Button size="sm" variant="outline" onClick={() => setRemind(true)}>
            {service.reminded ? "Remind again" : "Remind client"}
          </Button>
        )}
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/clients/${service.clientId}#sites`}>Open client</Link>
        </Button>
        {showMoney && termPaymentId && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/payments?inspect=${termPaymentId}`}>
              <Receipt className="size-3.5" aria-hidden />
              Open the payment
            </Link>
          </Button>
        )}
      </div>
      <ServiceConfirm confirm={confirm} showMoney={showMoney} onClose={() => setConfirm(null)} />
      {remind && (
        <ReminderSheet service={service} emailConfigured={emailConfigured} onClose={() => setRemind(false)} />
      )}
      {activating && <ActivateServiceSheet service={service} onClose={() => setActivating(false)} />}
    </>
  );
}

export function ServicesList({
  services,
  title = "Services",
  description,
  createScope,
  scopes,
  showClient = false,
  showProject = false,
  showMoney = false,
  canManage,
  canRemind,
  canDelete,
  embedded = false,
  inspectable = false,
  emailConfigured = false,
  emptyText,
}: {
  services: ServiceScreenRow[];
  title?: string;
  description?: string;
  createScope?: ServiceScope;
  scopes?: Record<string, ServiceScope>;
  showClient?: boolean;
  showProject?: boolean;
  showMoney?: boolean;
  canManage: boolean;
  canRemind: boolean;
  canDelete: boolean;
  embedded?: boolean;
  inspectable?: boolean;
  emailConfigured?: boolean;
  emptyText?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rowOpen = useRowOpen();
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [confirm, setConfirm] = React.useState<Confirm>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const scopeFor = (service: ServiceScreenRow): ServiceScope =>
    scopes?.[service.clientId] ??
    createScope ?? {
      clientId: service.clientId,
      projects: service.projectId ? [{ id: service.projectId, name: service.projectName ?? "Project" }] : [],
      products: service.productId ? [{ id: service.productId, name: service.productName ?? "Product" }] : [],
      currency: service.currency,
    };

  async function act(service: ServiceScreenRow, body: Record<string, unknown>, success: string) {
    setBusy(service.id);
    await runQuickAction(router, service, body, success);
    setBusy(null);
  }

  const addButton = (label: string) =>
    createScope && canManage ? (
      <Button variant="outline" size="sm" onClick={() => setOverlay({ type: "create" })}>
        <Plus className="size-3.5" />
        {label}
      </Button>
    ) : undefined;

  const body =
    services.length === 0 ? (
      <EmptyInline action={addButton("Add the first service")}>
        {emptyText ??
          "Nothing recorded. Add the domain, hosting and mailboxes this client holds through us — each one counts down to its expiry and raises an alert before it lapses."}
      </EmptyInline>
    ) : (
      <ul className="divide-y divide-border-subtle">
        {services.map((service) => {
          const Icon = KIND_ICON[service.kind];
          const state = statusOf("clientServiceState", service.state);
          const expires = service.expiresAt ? new Date(service.expiresAt) : null;
          const isBusy = busy === service.id;
          const dimmed = service.status === "CANCELLED";
          const nameClass = cn(
            "truncate text-base font-medium",
            service.kind === "DOMAIN" && "font-mono",
            dimmed && "text-muted-foreground line-through decoration-border-mid",
          );
          return (
            <li
              key={service.id}
              id={`service-${service.id}`}
              onClick={inspectable ? rowOpen(inspectHref(pathname, searchParams, service.id)) : undefined}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:flex-nowrap",
                inspectable && "cursor-pointer hover:bg-surface/70",
                isBusy && "opacity-60",
              )}
            >
              <Icon
                className={cn("size-4 shrink-0", dimmed ? "text-subtle-foreground" : "text-muted-foreground")}
                aria-hidden
              />

              <div className="min-w-0 flex-1 basis-48">
                <p className="flex min-w-0 items-baseline gap-2">
                  {inspectable ? (
                    <Link
                      href={inspectHref(pathname, searchParams, service.id)}
                      scroll={false}
                      className={cn(nameClass, "rounded-xs underline-offset-2 hover:underline")}
                    >
                      {service.name}
                    </Link>
                  ) : (
                    <span className={nameClass}>{service.name}</span>
                  )}
                  <span className="telemetry shrink-0 text-subtle-foreground">{KIND_LABEL[service.kind]}</span>
                </p>
                <p className="truncate text-meta text-muted-foreground">
                  {showClient && (
                    <>
                      <EntityLink type="client" id={service.clientId} muted>
                        {service.clientLabel}
                      </EntityLink>
                      {" · "}
                    </>
                  )}
                  {[
                    service.provider,
                    showProject ? service.projectName : null,
                    service.productName && !showProject ? service.productName : null,
                    service.autoRenew ? "auto-renews at provider" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No provider recorded"}
                </p>
              </div>

              <div className="shrink-0 text-end sm:w-40">
                <p className={cn("text-base", showMoney ? "font-mono tabular-nums" : "text-subtle-foreground")}>
                  {showMoney ? (
                    <>
                      {money(service.price, service.currency)}
                      <span className="ms-1 text-meta text-subtle-foreground">{perTermLabel(service.termMonths)}</span>
                    </>
                  ) : (
                    FINANCE_ONLY
                  )}
                </p>
                <p className="text-meta text-subtle-foreground">
                  {isOneTime(service)
                    ? service.projectId
                      ? "bought once — one payment on the project"
                      : "bought once — not on a project, record it on the payments screen"
                    : service.firstTermIncluded
                      ? "first term in project fee"
                      : service.projectId
                        ? "each term opens a payment on the project"
                        : "not on a project — record each term on the payments screen"}
                </p>
              </div>

              <div className="shrink-0 sm:w-44 sm:text-end">
                <StatusPill registry="clientServiceState" value={service.state} />
                <p
                  className={cn(
                    "mt-1 font-mono text-meta tabular-nums",
                    expires && !dimmed ? toneText[state.tone] : "text-subtle-foreground",
                  )}
                >
                  {isOneTime(service)
                    ? service.status === "PENDING"
                      ? "not bought yet"
                      : "bought once · never expires"
                    : expires
                      ? dimmed
                        ? `was due ${date(expires)}`
                        : `${date(expires)} · ${expiryPhrase(expires)}`
                      : "no expiry until registered"}
                </p>
                {service.status === "ACTIVE" && needsAttention(service.state) && (
                  <p className={cn("text-meta", service.reminded ? "text-subtle-foreground" : "text-warning")}>
                    {service.reminded && service.reminderSentAt
                      ? `client reminded ${date(service.reminderSentAt)}`
                      : "client not reminded"}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {canManage && service.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => setOverlay({ type: "activate", service })}
                  >
                    {isOneTime(service) ? "Mark bought" : "Mark registered"}
                  </Button>
                )}
                {canRemind && service.status === "ACTIVE" && needsAttention(service.state) && !service.reminded && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => setOverlay({ type: "remind", service })}
                  >
                    Remind client
                  </Button>
                )}
                {canManage && service.status === "ACTIVE" && needsAttention(service.state) && service.reminded && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => setConfirm({ type: "renew", service })}
                  >
                    Mark renewed
                  </Button>
                )}

                {/* Not modal: a modal menu that opens a modal dialog leaves body pointer-events stuck at none. */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${service.name}`}>
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManage && (
                      <DropdownMenuItem onSelect={() => setOverlay({ type: "edit", service })}>Edit</DropdownMenuItem>
                    )}
                    {canManage && renewable(service) && (
                      <DropdownMenuItem onSelect={() => setConfirm({ type: "renew", service })}>
                        Mark renewed — next term…
                      </DropdownMenuItem>
                    )}
                    {canRemind && renewable(service) && (
                      <DropdownMenuItem onSelect={() => setOverlay({ type: "remind", service })}>
                        {service.reminded ? "Remind client again…" : "Remind client…"}
                      </DropdownMenuItem>
                    )}
                    {canManage && service.kind === "DOMAIN" && service.status !== "PENDING" && !isOneTime(service) && (
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
                        <Link href={`/clients/${service.clientId}#sites`}>Open client</Link>
                      </DropdownMenuItem>
                    )}
                    {service.projectId && !showProject && (
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${service.projectId}#services`}>Open project</Link>
                      </DropdownMenuItem>
                    )}
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        {service.status === "CANCELLED" ? (
                          <DropdownMenuItem
                            onSelect={() => act(service, { action: "reactivate" }, `${service.name} reactivated.`)}
                          >
                            Reactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => setConfirm({ type: "cancel", service })}>
                            Cancel service…
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {canDelete && (
                  <DeleteRecordButton
                    entity="clientService"
                    id={service.id}
                    label={service.name}
                    size="icon-sm"
                    aria-label={`Delete ${service.name}`}
                  >
                    {null}
                  </DeleteRecordButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );

  return (
    <>
      {embedded ? (
        <div>
          {createScope && services.length > 0 && (
            <div className="flex justify-end border-b border-border-subtle px-3 py-2">{addButton("Add service")}</div>
          )}
          {body}
        </div>
      ) : (
        <Panel title={title} description={description} flush action={addButton("Add service")}>
          {body}
        </Panel>
      )}

      <ServiceConfirm confirm={confirm} showMoney={showMoney} onClose={() => setConfirm(null)} />

      {overlay?.type === "create" && createScope && (
        <ServiceSheet scope={createScope} showMoney={showMoney} onClose={() => setOverlay(null)} />
      )}
      {overlay?.type === "edit" && (
        <ServiceSheet
          scope={scopeFor(overlay.service)}
          service={overlay.service}
          showMoney={showMoney}
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
