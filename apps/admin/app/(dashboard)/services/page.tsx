import { prisma } from "@repo/database";

import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { NewServiceButton } from "@/components/os/services/new-service-button";
import { ServicesList } from "@/components/os/services/services-list";
import type { ClientOption, ServiceScope } from "@/components/os/services/service-sheet";
import { clientLabel, listServices } from "@/lib/client-services";
import { emailTransport } from "@/lib/email";
import { moneyByCurrency } from "@/lib/format";
import { annualised, ALERT_THRESHOLDS } from "@/lib/service-lifecycle";

import { CheckRenewalsButton } from "./check-renewals";

export const dynamic = "force-dynamic";

/**
 * Services & renewals.
 *
 * Every domain, hosting plan and mailbox any client holds through Altruvex, on
 * one screen, sorted by what runs out first. The question it answers is "what
 * lapses this month, and who pays for it" — without opening every client.
 *
 * Nothing here is stored as "expiring". The state of each row, the tiles and
 * the sidebar badge are all derived from `expiresAt` and the clock, so they are
 * right whether or not the scheduled sweep has run.
 */
export default async function ServicesPage() {
  const [services, clients] = await Promise.all([
    listServices(),
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        projects: { select: { id: true, name: true }, orderBy: { createdAt: "desc" } },
        products: { select: { id: true, name: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const clientOptions: ClientOption[] = clients.map((client) => ({
    id: client.id,
    label: clientLabel(client),
    projects: client.projects,
    products: client.products,
  }));
  const scopes: Record<string, ServiceScope> = Object.fromEntries(
    clientOptions.map((client) => [
      client.id,
      { clientId: client.id, projects: client.projects, products: client.products, currency: "EGP" },
    ]),
  );

  const due = services.filter(
    (s) => s.state === "expired" || s.state === "urgent" || s.state === "renewing-soon",
  );
  const pending = services.filter((s) => s.state === "pending");
  const rest = services.filter((s) => s.state === "active" || s.state === "cancelled");

  const expired = services.filter((s) => s.state === "expired").length;
  const urgent = services.filter((s) => s.state === "urgent").length;
  const soon = services.filter((s) => s.state === "renewing-soon").length;

  // What the client book pays per year in services, per currency — never
  // summed across currencies. Pending counts: it is agreed revenue.
  const yearly: Record<string, number> = {};
  for (const service of services) {
    if (service.status === "CANCELLED") continue;
    yearly[service.currency] =
      (yearly[service.currency] ?? 0) + annualised(service.price, service.termMonths);
  }

  const scheduled = Boolean(process.env.CRON_SECRET);
  const emailConfigured = emailTransport() !== "none";

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
            <CheckRenewalsButton />
            <NewServiceButton scope={{ clientId: "", clients: clientOptions, projects: [], products: [], currency: "EGP" }} />
          </>
        }
      />

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
          value={moneyByCurrency(yearly, true)}
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
          emailConfigured={emailConfigured}
        />
      )}

      <ServicesList
        title={due.length + pending.length > 0 ? "Everything else" : "All services"}
        description="Inside their paid term, or cancelled"
        services={rest}
        scopes={scopes}
        showClient
        showProject
        emailConfigured={emailConfigured}
        emptyText={
          services.length === 0
            ? "No services recorded for any client. Add one here, from a client or project, or list them in a proposal — signing it opens them automatically."
            : "Nothing else — every service is listed above."
        }
      />
    </div>
  );
}
