import Link from "next/link";
import { prisma } from "@repo/database";
import { getCompanySettings } from "@/lib/company-settings";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { TabNav } from "@/components/os/tab-nav";
import { MetaList } from "@/components/os/detail-layout";
import { ToneBadge } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { optionsOf, toneDot } from "@/lib/status";
import { PROJECT_PHASE_ORDER } from "@/lib/status";
import { PIPELINE_STAGES } from "@/lib/dashboard-data";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CompanyProfileEditor } from "./company-profile-editor";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "organization", label: "Organization" },
  { id: "workflow", label: "Workflow" },
  { id: "templates", label: "Templates" },
  { id: "security", label: "Security" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : "organization";

  const [company, sessions, users] = await Promise.all([
    getCompanySettings(),
    prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        updatedAt: true,
        expiresAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Company identity, the workflow vocabulary the whole system speaks, and the security posture of this application."
        tabs={<TabNav tabs={TABS} active={tab} basePath="/settings" />}
      />

      {tab === "organization" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Company profile"
            description="Used on every generated proposal and contract"
            action={
              <CompanyProfileEditor
                initialData={{
                  phone: company.phone,
                  email: company.email,
                  website: company.website,
                  brandColor: company.brandColor,
                  brandColorDark: company.brandColorDark,
                }}
              />
            }
            flush
          >
            <MetaList
              items={[
                { label: "Phone", value: <span className="font-mono text-meta">{company.phone}</span> },
                { label: "Email", value: company.email },
                { label: "Website", value: company.website },
              ]}
            />
          </Panel>

          <Panel title="Brand" description="The one accent, in its light and dark forms">
            <div className="space-y-3">
              <SwatchRow label="Light surface accent" hex={company.brandColor} />
              <SwatchRow label="Dark surface accent" hex={company.brandColorDark} />
              <p className="border-t border-border pt-3 text-base text-muted-foreground">
                Changing these is a company-wide branding decision, not a per-client one.
                The deck’s visual system is fixed; only its content varies per client.
              </p>
            </div>
          </Panel>

          <Panel title="Where these values live" className="lg:col-span-2">
            <p className="max-w-prose text-base text-muted-foreground">
              A single <code className="font-mono text-micro">CompanySettings</code> row,
              id <code className="font-mono text-micro">default</code>, seeded on first use
              from the values the proposal generator already shipped with. Editing them here
              is deliberately not wired up yet: they feed generated legal and commercial
              documents, so the edit path needs an approval step and a version record before
              it exists. Change them in the database until then.
            </p>
          </Panel>
        </div>
      )}

      {tab === "workflow" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Pipeline stages"
            description="The order a deal moves through. Four of these are computed, not set."
            flush
          >
            <ul className="rows">
              {PIPELINE_STAGES.map((stage, i) => {
                const derived = ["PROPOSAL_SENT", "PROPOSAL_READ", "CONTRACT_SENT", "SIGNED"].includes(stage);
                return (
                  <li key={stage} className="flex items-center gap-3 px-3 py-2">
                    <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 text-base">
                      {stage.replace(/_/g, " ").toLowerCase()}
                    </span>
                    {derived ? (
                      <ToneBadge tone="info">derived</ToneBadge>
                    ) : (
                      <span className="telemetry text-subtle-foreground">settable</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Project phases" description="The default milestone set for delivery" flush>
            <ul className="rows">
              {PROJECT_PHASE_ORDER.map((phase, i) => (
                <li key={phase} className="flex items-center gap-3 px-3 py-2">
                  <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-base">
                    {phase.replace(/_/g, " ").toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Status vocabulary"
            description="Every state in the system, and the tone it carries everywhere"
            className="lg:col-span-2"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["Leads & clients", "submissionStatus"],
                  ["Priority", "priority"],
                  ["Proposals", "proposalStatus"],
                  ["Contracts", "contractStatus"],
                  ["Projects", "projectStatus"],
                  ["Payments", "paymentStatus"],
                ] as const
              ).map(([label, registry]) => (
                <div key={registry}>
                  <p className="telemetry mb-1.5 text-subtle-foreground">{label}</p>
                  <ul className="space-y-1">
                    {optionsOf(registry).map((option) => (
                      <li key={option.value} className="flex items-center gap-2 text-base">
                        <span className={cn("size-1.5 rounded-full", toneDot[option.tone])} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        <span className="font-mono text-micro text-subtle-foreground">
                          {option.tone}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-prose border-t border-border pt-3 text-base text-muted-foreground">
              Six tones, no more. Every enum in the schema maps to exactly one of them in{" "}
              <code className="font-mono text-micro">lib/status.ts</code>, which is why the
              same state never looks different on two screens. A seventh colour would be a
              design bug, not a feature.
            </p>
          </Panel>
        </div>
      )}

      {tab === "templates" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Proposal template" description="Live — the structured deck content">
            <p className="max-w-prose text-base text-muted-foreground">
              Every string the generated deck renders is validated by{" "}
              <code className="font-mono text-micro">lib/proposal-schema.ts</code> and edited
              per client in the proposal builder. Labels that carry a computed value (the
              total, the validity date, the week count) are template strings the schema
              refuses to accept without their placeholder — so nobody can silently delete a
              number from a slide by rewording a label.
            </p>
          </Panel>
          <Panel title="Contract template" description="Live — generated from an accepted proposal">
            <p className="max-w-prose text-base text-muted-foreground">
              Built by <code className="font-mono text-micro">lib/contract-builder.ts</code>{" "}
              with the proposal’s own numbers. There is no separate place to type a price
              into a contract, which is the point: a contract cannot disagree with the offer
              it came from.
            </p>
          </Panel>
          <Panel
            title="Message and email templates"
            description="Partly live, partly planned"
            className="lg:col-span-2"
            flush
          >
            <ul className="rows">
              <TemplateRow
                name="WhatsApp — proposal delivery"
                state="live"
                detail="Sent by the proposal Send action; recorded against the proposal."
              />
              <TemplateRow
                name="WhatsApp — contract for signature"
                state="live"
                detail="Carries the single-purpose signing link."
              />
              <TemplateRow
                name="WhatsApp — post-signature onboarding"
                state="live"
                detail="The what-happens-now message. The most valuable automation in the system."
              />
              <TemplateRow
                name="Email — everything"
                state="planned"
                detail="Blocked on a mail transport. See Integrations."
              />
              <TemplateRow
                name="Invoice document"
                state="planned"
                detail="Blocked on an Invoice model. Payments exist; invoices as documents do not."
              />
            </ul>
          </Panel>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <AlertBar tone="info" href="/audit" cta="See the audit trail">
            Access to this application is gated at the edge: the proxy refuses every
            request without an ADMIN or SUPERADMIN session before a page renders. Server
            actions re-check permission independently — the UI deciding what to draw is
            never the access decision.
          </AlertBar>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Posture" flush>
              <MetaList
                items={[
                  { label: "Auth", value: "Better Auth, email + password" },
                  { label: "Sign-up", value: "Disabled — accounts are seeded" },
                  { label: "Session life", value: "7 days" },
                  { label: "2FA", value: "Not enabled" },
                  { label: "Users", value: String(users) },
                  { label: "CSP", value: "Enforced, no external script origins" },
                  { label: "Frame options", value: "DENY" },
                  { label: "HSTS", value: "1 year, preload" },
                ]}
              />
            </Panel>

            <Panel
              title="Active sessions"
              description="Every signed-in browser right now"
              flush
            >
              {sessions.length === 0 ? (
                <p className="px-3 py-6 text-base text-muted-foreground">No active sessions.</p>
              ) : (
                <ul className="rows">
                  {sessions.map((session) => (
                    <li key={session.id} className="px-3 py-2.5">
                      <p className="truncate text-base font-medium">
                        {session.user.name ?? session.user.email}
                      </p>
                      <p className="truncate font-mono text-micro text-subtle-foreground">
                        {session.ipAddress ?? "no ip"} · expires {dateTime(session.expiresAt)}
                      </p>
                      {session.userAgent && (
                        <p className="mt-0.5 truncate text-meta text-muted-foreground">
                          {session.userAgent.slice(0, 80)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Known gaps" description="Stated rather than hidden">
            <ul className="space-y-2">
              {[
                "No second factor. Password compromise is currently full compromise of this application.",
                "No audit table. The activity timeline is derived from records, which cannot show who changed a value or what it was before.",
                "Roles beyond ADMIN/SUPERADMIN are enforced in code but cannot be assigned until the schema carries them.",
                "Signing is click-to-sign with IP and timestamp — evidence of assent, not a qualified electronic signature.",
              ].map((gap) => (
                <li key={gap} className="flex gap-2 text-base">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" aria-hidden />
                  <span className="text-muted-foreground">{gap}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/health"
              className="mt-3 inline-flex text-base text-brand hover:underline"
            >
              System health →
            </Link>
          </Panel>
        </div>
      )}
    </div>
  );
}

function SwatchRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-8 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: `#${hex}` }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-base">{label}</span>
        <span className="block font-mono text-micro text-subtle-foreground">#{hex}</span>
      </span>
    </div>
  );
}

function TemplateRow({
  name,
  state,
  detail,
}: {
  name: string;
  state: "live" | "planned";
  detail: string;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium">{name}</p>
        <p className="truncate text-meta text-muted-foreground">{detail}</p>
      </div>
      <ToneBadge tone={state === "live" ? "success" : "neutral"}>
        {state === "live" ? "Live" : "Planned"}
      </ToneBadge>
    </li>
  );
}
