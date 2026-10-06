import Link from "next/link";
import { Blocks } from "lucide-react";
import { List, ListRow } from "@/components/os/list-row";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ToneBadge } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { MetaList } from "@/components/os/detail-layout";
import { getHealthChecks, STATE_LABEL, STATE_TONE, type HealthCheck } from "@/lib/system-health";
import { dateTime } from "@/lib/format";
import { gateRoute } from "@/lib/page-gate";
import { Button, Hint } from "@repo/ui";
import { SlackButton } from "@/components/os/slack-button";
import { PickToOpen, type PickOption } from "@/components/os/pick-to-open";
import { prisma } from "@repo/database";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const PLANNED = [
  { name: "Stripe", why: "Card and link payments against an invoice, with webhook reconciliation." },
  { name: "Dropbox Sign / DocuSign", why: "Qualified e-signature behind the existing contract status field." },
  { name: "Google Workspace", why: "Two-way calendar sync for meetings and launch dates." },
];

export default async function IntegrationsPage() {
  const denied = await gateRoute("/integrations", "integrations");
  if (denied) return denied;

  const [checks, role] = await Promise.all([getHealthChecks(), currentRole()]);
  // "Set up on a product" lands on the chosen product's own field (#github / #ingest-token), not the list.
  const canOpenProducts = roleCanOpen(role, "/products");
  const canEditProduct = can(role, "edit", "project");
  const canAddProduct = can(role, "create", "project");
  const products = canOpenProducts
    ? await prisma.product.findMany({
        orderBy: { name: "asc" },
        take: 51,
        select: { id: true, name: true },
      })
    : [];
  const productPicks: PickOption[] = products.slice(0, 50).map((p) => ({
    label: p.name,
    href: `/products/${p.id}`,
  }));
  const productFooter =
    products.length > 50 ? { label: "All products", href: "/products" } : undefined;
  const anchorFor = (list: HealthCheck[]) =>
    list.length === 1
      ? `#${list[0]!.id}`
      : list.some((c) => c.category === "infrastructure")
        ? "#infrastructure"
        : "#integrations";
  const integrations = checks.filter((c) => c.category === "integration");
  const infrastructure = checks.filter((c) => c.category === "infrastructure");
  const down = checks.filter((c) => c.state === "down");
  const degraded = checks.filter((c) => c.state === "degraded");
  const unconfigured = checks.filter((c) => c.state === "unconfigured");
  const ok = checks.filter((c) => c.state === "ok");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integrations"
        description="Connection state, configuration and health for every dependency this application has. Checks run when the page loads and are made against the live environment — nothing reports healthy because a flag says so. The ones with a screen link to it; the rest are configured by environment variable and need a redeploy."
        alert={
          down.length > 0 ? (
            <AlertBar tone="danger" href={anchorFor(down)} cta="Read the impact and recovery">
              {down.length} dependenc{down.length === 1 ? "y is" : "ies are"} down. The impact is
              described on each card below.
            </AlertBar>
          ) : degraded.length > 0 ? (
            <AlertBar tone="warning" href={anchorFor(degraded)} cta="Read the impact and recovery">
              {degraded.length} dependenc{degraded.length === 1 ? "y is" : "ies are"} degraded —
              working, but losing some requests.
            </AlertBar>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Healthy" value={ok.length} tone={ok.length ? "success" : "neutral"} sub="Responding normally" />
        <StatTile label="Degraded" value={degraded.length} tone={degraded.length ? "warning" : "neutral"} sub="Partially failing" />
        <StatTile label="Down" value={down.length} tone={down.length ? "danger" : "success"} sub="Not responding" />
        <StatTile label="Not configured" value={unconfigured.length} sub="Feature unavailable" />
      </div>

      <section id="integrations" className="scroll-mt-20 space-y-3">
        <h2 className="telemetry text-subtle-foreground">External services</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {integrations.map((check) => (
            <CheckCard
              key={check.id}
              check={check}
              productPicks={productPicks}
              productFooter={productFooter}
              canOpenProducts={canOpenProducts}
              canEditProduct={canEditProduct}
              canAddProduct={canAddProduct}
            />
          ))}
        </div>
      </section>

      <section id="infrastructure" className="scroll-mt-20 space-y-3">
        <h2 className="telemetry text-subtle-foreground">This application</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {infrastructure.map((check) => (
            <CheckCard
              key={check.id}
              check={check}
              productPicks={productPicks}
              productFooter={productFooter}
              canOpenProducts={canOpenProducts}
              canEditProduct={canEditProduct}
              canAddProduct={canAddProduct}
            />
          ))}
        </div>
      </section>

      <Panel
        title="Decided, not yet built"
        description="These are on the roadmap. Nothing here is connected, and nothing pretends to be."
        flush
      >
        <List label="Planned integrations">
          {PLANNED.map((item) => (
            <ListRow
              key={item.name}
              icon={<Blocks />}
              title={item.name}
              meta={<span className="min-w-0 whitespace-normal">{item.why}</span>}
              trailing={<span className="telemetry text-subtle-foreground">planned</span>}
            />
          ))}
        </List>
      </Panel>
    </div>
  );
}

function CheckCard({
  check,
  productPicks,
  productFooter,
  canOpenProducts,
  canEditProduct,
  canAddProduct,
}: {
  check: HealthCheck;
  productPicks: PickOption[];
  productFooter?: PickOption;
  canOpenProducts: boolean;
  canEditProduct: boolean;
  canAddProduct: boolean;
}) {
  return (
    <div id={check.id} className="scroll-mt-20 flex flex-col [&>section]:flex-1">
    <Panel
      title={check.name}
      description={check.summary}
      action={
        <div className="flex items-center gap-2">
          {check.setup?.href === "/products" && productPicks.length > 0 && canEditProduct ? (
            <PickToOpen
              label={check.setup.label}
              size="sm"
              searchPlaceholder="Find a product"
              options={productPicks.map((pick) => ({
                ...pick,
                href: `${pick.href}#${check.id === "github" ? "github" : check.id === "ingest" ? "ingest-token" : "connect"}`,
              }))}
              footer={productFooter}
            />
          ) : check.setup?.href === "/products" && productPicks.length === 0 && canOpenProducts && canAddProduct ? (
            // No product yet: the token or repository lives on one, so start it.
            <Button asChild variant="outline" size="sm">
              <Link href="/products?new=product">Add a product</Link>
            </Button>
          ) : check.setup && check.setup.href !== "/products" && (
            <Button asChild variant="outline" size="sm">
              <Link href={check.setup.href}>{check.setup.label}</Link>
            </Button>
          )}
          {check.id === "slack" &&
            (check.state === "unconfigured" ? (
              <Hint label="Set SLACK_WEBHOOK_URL and redeploy — there is nothing to post to yet">
                <span className="inline-flex">
                  <SlackButton action="test" label="Send a test" pendingLabel="Sending…" disabled />
                </span>
              </Hint>
            ) : (
              <SlackButton action="test" label="Send a test" pendingLabel="Sending…" />
            ))}
          <ToneBadge tone={STATE_TONE[check.state]}>{STATE_LABEL[check.state]}</ToneBadge>
        </div>
      }
      flush
    >
      <div className="space-y-3 p-3">
        <div>
          <p className="telemetry text-subtle-foreground">If this breaks</p>
          <p className="mt-0.5 text-base text-muted-foreground">{check.impact}</p>
        </div>
        {check.remedy && (
          <div className="rounded-panel-sm border border-warning/25 bg-warning/[0.06] p-2.5">
            <p className="telemetry text-warning">Fix</p>
            <p className="mt-0.5 text-base">{check.remedy}</p>
          </div>
        )}
        {check.detail && (
          <details>
            <summary className="telemetry cursor-pointer text-subtle-foreground hover:text-foreground">
              Technical detail
            </summary>
            <pre className="mt-1.5 overflow-x-auto rounded-panel-sm border border-border-subtle bg-surface p-2 font-mono text-micro text-muted-foreground">
              {check.detail}
            </pre>
          </details>
        )}
      </div>
      {check.metrics && (
        <MetaList
          className="border-t border-border-subtle"
          items={check.metrics.map((m) => ({ label: m.label, value: m.value }))}
        />
      )}
      <p className="border-t border-border-subtle px-3 py-1.5 font-mono text-micro text-subtle-foreground">
        Checked {dateTime(check.lastChecked)}
      </p>
    </Panel>
    </div>
  );
}
