import { prisma } from "@repo/database";

import { FilterChip } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { NewServiceButton } from "@/components/os/services/new-service-button";
import { ServiceInspectorActions, ServicesList } from "@/components/os/services/services-list";
import type { ClientOption, ServiceScope } from "@/components/os/services/service-sheet";
import { StatusPill } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { clientLabel, listServices, redactMoney, type ServiceScreenRow } from "@/lib/client-services";
import { emailTransport } from "@/lib/email";
import { date, money, moneyByCurrency } from "@/lib/format";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import {
  annualised,
  ALERT_THRESHOLDS,
  expiryPhrase,
  isOneTime,
  KIND_LABEL,
  perTermLabel,
} from "@/lib/service-lifecycle";

import { CheckRenewalsButton } from "./check-renewals";
import { PROJECT_CURRENCY_SELECT, projectCurrency } from "@/lib/project-currency";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; inspect?: string }>;
}) {
  const denied = await gateRoute("/services");
  if (denied) return denied;

  const { client: clientParam, inspect } = await searchParams;
  const clientId = clientParam?.trim() || null;
  const role = await currentRole();
  const showMoney = canSeeFinance(role);
  const canManage = can(role, "edit", "project");
  const canCreate = can(role, "create", "project");
  const canRemind = can(role, "send", "message");
  const canDelete = can(role, "delete", "client");

  const [services, clients] = await Promise.all([
    listServices(clientId ? { clientId } : {}),
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        projects: {
          select: { id: true, name: true, ...PROJECT_CURRENCY_SELECT },
          orderBy: { createdAt: "desc" },
        },
        products: { select: { id: true, name: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const clientOptions: ClientOption[] = clients.map((client) => ({
    id: client.id,
    label: clientLabel(client),
    projects: client.projects.map((p) => ({ id: p.id, name: p.name, currency: projectCurrency(p) })),
    products: client.products,
  }));
  const scopes: Record<string, ServiceScope> = Object.fromEntries(
    clientOptions.map((client) => [
      client.id,
      {
        clientId: client.id,
        projects: client.projects,
        products: client.products,
        currency: client.projects[0]?.currency ?? DEFAULT_CURRENCY,
      },
    ]),
  );

  const forScreen = showMoney ? services : services.map(redactMoney);
  const due = forScreen.filter(
    (s) => s.state === "expired" || s.state === "urgent" || s.state === "renewing-soon",
  );
  const pending = forScreen.filter((s) => s.state === "pending");
  const rest = forScreen.filter(
    (s) => s.state === "active" || s.state === "one-time" || s.state === "cancelled",
  );

  const expired = services.filter((s) => s.state === "expired").length;
  const urgent = services.filter((s) => s.state === "urgent").length;
  const soon = services.filter((s) => s.state === "renewing-soon").length;

  const yearly: Record<string, number> = {};
  for (const service of services) {
    if (service.status === "CANCELLED") continue;
    yearly[service.currency] =
      (yearly[service.currency] ?? 0) + annualised(service.price, service.termMonths);
  }

  const scopeClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const scopeName = scopeClient ? clientLabel(scopeClient) : "Unknown client";

  const scheduled = Boolean(process.env.CRON_SECRET);
  const emailConfigured = emailTransport() !== "none";
  const inspected = inspect ? (forScreen.find((s) => s.id === inspect) ?? null) : null;
  const termPayment =
    inspected && showMoney && roleCanOpen(role, "/payments")
      ? await prisma.payment.findFirst({
          where: { serviceId: inspected.id },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Services & renewals"
        crumbs={[{ label: "Services & renewals" }]}
        description={`Domains, hosting and email each client holds through Altruvex — what they pay, and when it runs out. Alerts go to Notifications and Slack at ${ALERT_THRESHOLDS.filter((d) => d > 0).join(", ")} days and on the day.`}
        meta={
          <span>
            {scheduled
              ? "Checked daily at 06:00 UTC"
              : "No schedule configured (CRON_SECRET) — alerts are raised when you check"}
          </span>
        }
        actions={
          <>
            {canManage && <CheckRenewalsButton />}
            <NewServiceButton
              scope={{ clientId: "", clients: clientOptions, projects: [], products: [], currency: DEFAULT_CURRENCY }}
              showMoney={showMoney}
              canCreate={canCreate}
            />
          </>
        }
      />

      {(clientId || (inspect && !inspected)) && (
        <div className="flex flex-wrap gap-2">
          {clientId && <FilterChip label="Client" value={scopeName} clearHref="/services" />}
          {inspect && !inspected && (
            <FilterChip
              label="Service"
              value="Not found — it may have been deleted"
              clearHref={clientId ? `/services?client=${clientId}` : "/services"}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Expired"
          value={expired}
          tone={expired > 0 ? "danger" : "neutral"}
          sub={expired > 0 ? "the client's site or mail may be down" : "nothing has lapsed"}
        />
        <StatTile
          label="Expiring in 7 days"
          value={urgent}
          tone={urgent > 0 ? "danger" : "neutral"}
          sub="renew today"
        />
        <StatTile
          label="Renewing in 30 days"
          value={soon}
          tone={soon > 0 ? "warning" : "neutral"}
          sub="invoice before the date"
        />
        <StatTile
          label="Services per year"
          value={showMoney ? moneyByCurrency(yearly, true) || "0" : "Finance only"}
          sub={`${services.length - pending.length - services.filter((s) => s.status === "CANCELLED").length} active · ${pending.length} not registered`}
        />
      </div>

      {due.length > 0 && (
        <ServicesList
          title="Needs a decision"
          description="Renew at the provider, then invoice the client for the next term"
          services={due}
          scopes={scopes}
          showClient
          showProject
          showMoney={showMoney}
          canManage={canManage}
          canRemind={canRemind}
          canDelete={canDelete}
          inspectable
          emailConfigured={emailConfigured}
        />
      )}

      {pending.length > 0 && (
        <ServicesList
          title="Not registered yet"
          description="Agreed — usually in a signed proposal — but not bought. No expiry, no alerts, until marked registered."
          services={pending}
          scopes={scopes}
          showClient
          showProject
          showMoney={showMoney}
          canManage={canManage}
          canRemind={canRemind}
          canDelete={canDelete}
          inspectable
          emailConfigured={emailConfigured}
        />
      )}

      <ServicesList
        title={due.length + pending.length > 0 ? "Everything else" : "All services"}
        description="Inside their paid term, bought outright, or cancelled"
        services={rest}
        scopes={scopes}
        showClient
        showProject
        showMoney={showMoney}
        canManage={canManage}
        canRemind={canRemind}
        canDelete={canDelete}
        inspectable
        emailConfigured={emailConfigured}
        emptyText={
          services.length === 0
            ? clientId
              ? `No services recorded for ${scopeName}. Add one here, from the client's page, or list them in a proposal — signing it opens them automatically.`
              : "No services recorded for any client. Add one here, from a client or project, or list them in a proposal — signing it opens them automatically."
            : "Nothing else — every service is listed above."
        }
      />

      {inspected && (
        <ServiceInspector
          service={inspected}
          showMoney={showMoney}
          canManage={canManage}
          canRemind={canRemind}
          emailConfigured={emailConfigured}
          termPaymentId={termPayment?.id ?? null}
        />
      )}
    </div>
  );
}

const DEFAULT_CURRENCY = "EGP";

function ServiceInspector({
  service,
  showMoney,
  canManage,
  canRemind,
  emailConfigured,
  termPaymentId,
}: {
  service: ServiceScreenRow;
  showMoney: boolean;
  canManage: boolean;
  canRemind: boolean;
  emailConfigured: boolean;
  termPaymentId: string | null;
}) {
  const expires = service.expiresAt ? new Date(service.expiresAt) : null;
  const oneTime = isOneTime(service);
  return (
    <InspectSheet
      open
      title={service.name}
      subtitle={`${KIND_LABEL[service.kind]}${service.provider ? ` · ${service.provider}` : ""}`}
      status={<StatusPill registry="clientServiceState" value={service.state} variant="dot" />}
      footer={
        <ServiceInspectorActions
          service={service}
          showMoney={showMoney}
          canManage={canManage}
          canRemind={canRemind}
          emailConfigured={emailConfigured}
          termPaymentId={termPaymentId}
        />
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-base">
        <div>
          <dt className="telemetry text-subtle-foreground">Client</dt>
          <dd className="mt-1">
            <EntityLink type="client" id={service.clientId}>
              {service.clientLabel}
            </EntityLink>
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Project</dt>
          <dd className="mt-1 text-muted-foreground">
            {service.projectId ? (
              <EntityLink type="project" id={service.projectId}>
                {service.projectName ?? "Project"}
              </EntityLink>
            ) : (
              "Not on a project"
            )}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Price</dt>
          <dd className={showMoney ? "mt-1 font-mono tabular-nums" : "mt-1 text-subtle-foreground"}>
            {showMoney ? `${money(service.price, service.currency)} ${perTermLabel(service.termMonths)}` : "Finance only"}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Billing</dt>
          <dd className="mt-1 text-muted-foreground">
            {oneTime
              ? service.projectId
                ? "One payment on the project at purchase — never renews"
                : "Bought once — recorded by hand on the payments screen"
              : service.firstTermIncluded
                ? "First term in the project fee"
                : service.projectId
                  ? "Each term opens a payment on the project"
                  : "Recorded by hand on the payments screen"}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Expires</dt>
          <dd className="mt-1 font-mono tabular-nums">
            {oneTime
              ? "Never — bought once"
              : expires
                ? `${date(expires)} · ${expiryPhrase(expires)}`
                : "No expiry until registered"}
          </dd>
        </div>
        {!oneTime && (
          <div>
            <dt className="telemetry text-subtle-foreground">Reminded</dt>
            <dd className="mt-1 text-muted-foreground">
              {service.reminded && service.reminderSentAt ? date(service.reminderSentAt) : "Not this cycle"}
            </dd>
          </div>
        )}
        {service.reference && (
          <div>
            <dt className="telemetry text-subtle-foreground">Reference</dt>
            <dd className="mt-1 font-mono text-muted-foreground">{service.reference}</dd>
          </div>
        )}
        {service.lastRenewedAt && (
          <div>
            <dt className="telemetry text-subtle-foreground">Last renewed</dt>
            <dd className="mt-1 text-muted-foreground">{date(service.lastRenewedAt)}</dd>
          </div>
        )}
      </dl>
      {service.notes && <p className="mt-4 whitespace-pre-wrap text-base text-muted-foreground">{service.notes}</p>}
    </InspectSheet>
  );
}
