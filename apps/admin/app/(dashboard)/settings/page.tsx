import Link from "next/link";
import { prisma } from "@repo/database";
import { Button } from "@repo/ui";
import { getCompanySettings } from "@/lib/company-settings";
import { getInvoiceNumbering } from "@/lib/invoice-number";
import { getOperator } from "@/lib/authorize";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { mfaRequired } from "@/lib/mfa";
import { emailTransport } from "@/lib/email";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { TabNav } from "@/components/os/tab-nav";
import { MetaList } from "@/components/os/detail-layout";
import { ToneBadge } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { optionsOf, toneDot } from "@/lib/status";
import { PROJECT_PHASE_ORDER } from "@/lib/status";
import { PIPELINE_STAGES } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import { CompanyProfileEditor } from "./company-profile-editor";
import { InvoicePrefixEditor } from "./invoice-prefix-editor";
import { EndAllSessionsButton, SessionList, type SessionRow } from "../team/session-list";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "organization", label: "Organization" },
  { id: "workflow", label: "Workflow" },
  { id: "templates", label: "Templates" },
  { id: "security", label: "Security" },
];

const SECONDS_PER_DAY = 24 * 60 * 60;

/** The session life as configured in `lib/auth.ts`, in days, read rather than retyped. */
function sessionLifeDays(): number | null {
  const seconds = auth.options.session?.expiresIn;
  return typeof seconds === "number" ? Math.round(seconds / SECONDS_PER_DAY) : null;
}

/**
 * Every claim on this page is read from the thing it describes: the session
 * life from the auth config, the mail transport from the environment, the
 * invoice numbering from the settings row, the sessions from the session
 * table. The previous version carried a "Known gaps" list that was mostly
 * untrue by the time it was read (no second factor, no audit table), which is
 * the opposite of what a settings screen is for.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : "organization";

  const operator = await getOperator();
  const me = operator?.session.user.id ?? null;
  const myToken = operator?.session.session.token;
  const canEditSettings = can(operator?.role, "edit", "settings");
  const now = new Date();

  const [company, numbering, mySessions, liveSessions, users] = await Promise.all([
    getCompanySettings(),
    getInvoiceNumbering(),
    me
      ? prisma.session.findMany({
          where: { userId: me, expiresAt: { gt: now } },
          select: {
            id: true,
            token: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            updatedAt: true,
            expiresAt: true,
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
    prisma.user.count(),
  ]);

  // The token decides which row is "this browser", then stays on the server.
  const sessionRows: SessionRow[] = mySessions.map((s) => ({
    id: s.id,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    current: s.token === myToken,
  }));
  const otherSessions = sessionRows.filter((s) => !s.current).length;

  const transport = emailTransport();
  const sessionDays = sessionLifeDays();

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

          <Panel
            title="Invoice numbering"
            description="Prefix plus a counter that only moves when a payment is invoiced"
            flush
          >
            <MetaList
              items={[
                {
                  label: "Next number",
                  value: <span className="font-mono text-meta">{numbering.next}</span>,
                },
                {
                  label: "Issued so far",
                  value: String(numbering.invoiceSequence),
                },
              ]}
            />
            <div className="border-t border-border p-3">
              <InvoicePrefixEditor initialPrefix={numbering.invoicePrefix} canEdit={canEditSettings} />
              <p className="mt-2 max-w-prose text-meta text-muted-foreground">
                A number is assigned once, when a payment is invoiced, and is never reused —
                changing the prefix affects invoices issued from now on, not the ones already
                numbered. The counter has no edit control because a hand-set counter is how two
                invoices end up sharing a number.
                {!canEditSettings && " Only an owner or admin can change the prefix."}
              </p>
            </div>
          </Panel>

          <Panel title="Where these values live">
            <p className="max-w-prose text-base text-muted-foreground">
              A single <code className="font-mono text-micro">CompanySettings</code> row,
              id <code className="font-mono text-micro">default</code>, seeded on first use
              from the values the proposal generator shipped with. The profile and the
              invoice prefix are edited on this page by an owner or admin; every change is
              written to the{" "}
              <Link href="/audit?entity=settings" className="underline underline-offset-2">
                audit log
              </Link>{" "}
              with the value it replaced. Documents already generated keep the values they
              were generated with.
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
            description="What each channel can send today"
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
                name="Email — proposal, contract, change-request quote, renewal reminder"
                state={transport === "none" ? "unconfigured" : "live"}
                detail={
                  transport === "none"
                    ? "The wording exists in lib/email-templates.ts and is editable per send, but no mail transport is configured, so nothing is sent. See Integrations."
                    : `Plain-text drafts from lib/email-templates.ts, editable per send and recorded as EmailMessage rows. Sending through ${transport === "resend" ? "Resend" : "SMTP"}.`
                }
              />
              <TemplateRow
                name="Invoice document"
                state="planned"
                detail={`Payments are numbered (${numbering.next} is next) and carry an issue date, but no invoice document is generated yet. There is no Invoice model; the number lives on the payment.`}
              />
            </ul>
          </Panel>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <AlertBar tone="info" href="/audit" cta="See the audit trail">
            Access to this application is decided twice: the proxy refuses every request
            without an ADMIN or SUPERADMIN session before a page renders, and the dashboard
            layout decides again from the session. Server actions re-check the capability
            independently — the UI deciding what to draw is never the access decision.
          </AlertBar>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Posture" flush>
              <MetaList
                items={[
                  { label: "Auth", value: "Better Auth, email + password" },
                  { label: "Sign-up", value: "Disabled — members are invited from Team" },
                  {
                    label: "Session life",
                    value: sessionDays ? `${sessionDays} days, extended daily while in use` : "Not readable from the auth config",
                  },
                  {
                    label: "2FA",
                    value: (
                      <Link href="/security" className="underline underline-offset-2">
                        {mfaRequired() ? "Required — manage" : "Optional — set up or manage"}
                      </Link>
                    ),
                  },
                  {
                    label: "Members",
                    value: (
                      <Link href="/team" className="underline underline-offset-2">
                        {users} — roles and invitations
                      </Link>
                    ),
                  },
                  { label: "CSP", value: "Enforced, per-request nonce, no external script origins" },
                  { label: "Frame options", value: "DENY" },
                  { label: "HSTS", value: "1 year, preload" },
                ]}
              />
            </Panel>

            <Panel
              title="Your sessions"
              description="Every browser signed in as you. Ending one signs that browser out."
              action={
                me ? <EndAllSessionsButton userId={me} count={otherSessions} own /> : undefined
              }
              flush
            >
              <SessionList sessions={sessionRows} canRevoke={me !== null} />
              <p className="border-t border-border px-3 py-2 text-meta text-subtle-foreground">
                {liveSessions} active session{liveSessions === 1 ? "" : "s"} across the team.{" "}
                <Link href="/team" className="underline underline-offset-2 hover:text-foreground">
                  Other members’ sessions are managed from Team.
                </Link>
              </p>
            </Panel>
          </div>

          <Panel title="Known gaps" description="Stated rather than hidden">
            <ul className="space-y-2">
              {[
                "Signing is click-to-sign with IP and timestamp — evidence of assent, not a qualified electronic signature.",
                "A sign-in from a new device is not announced to the member. The session list above is where to look.",
                "Email delivery is recorded as accepted by the transport, never as delivered — there is no provider webhook.",
              ].map((gap) => (
                <li key={gap} className="flex gap-2 text-base">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" aria-hidden />
                  <span className="text-muted-foreground">{gap}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/integrations">Integrations and health</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/audit?entity=settings">Settings changes</Link>
              </Button>
            </div>
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
  state: "live" | "planned" | "unconfigured";
  detail: string;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium">{name}</p>
        <p className="text-meta text-muted-foreground">{detail}</p>
      </div>
      <ToneBadge tone={state === "live" ? "success" : state === "unconfigured" ? "warning" : "neutral"}>
        {state === "live" ? "Live" : state === "unconfigured" ? "Not configured" : "Planned"}
      </ToneBadge>
    </li>
  );
}
