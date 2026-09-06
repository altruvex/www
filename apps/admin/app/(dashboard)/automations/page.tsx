import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { AutomationsClient, type AutomationRule, type AutomationRun } from "./automations-client";

export const dynamic = "force-dynamic";

export default function AutomationsPage() {
  const now = Date.now();

  const rules: AutomationRule[] = [
    {
      id: "rule-contract-onboard",
      name: "Contract Signed → Onboarding & Schedule Initialization",
      description: "When a contract is signed by the client, instantly dispatch the WhatsApp welcome sequence and create delivery milestones.",
      trigger: "contract.signed",
      condition: "Contract status transitions to SIGNED with valid phone number",
      actions: [
        "Send WhatsApp onboarding template with client portal access token",
        "Generate project schedule milestones (Deposit 50%, Milestone 30%, Final 20%)",
        "Notify assigned account manager in Action Center",
      ],
      enabled: true,
      runCount: 14,
      lastRunAt: new Date(now - 3 * 86400000).toISOString(),
      category: "sales",
    },
    {
      id: "rule-proposal-accept",
      name: "Proposal Accepted → Contract Generation",
      description: "When an offer is accepted by the client, automatically draft the legally-binding contract preserving exact price terms.",
      trigger: "proposal.accepted",
      condition: "Client marks proposal ACCEPTED via signing portal",
      actions: [
        "Generate draft Contract record with accepted pricing & deliverables",
        "Prepare WhatsApp signing dispatch link",
        "Update CRM pipeline stage to CONTRACT_SENT",
      ],
      enabled: true,
      runCount: 28,
      lastRunAt: new Date(now - 86400000).toISOString(),
      category: "sales",
    },
    {
      id: "rule-payment-overdue",
      name: "Payment Overdue Auto-Escalation (>3 Days)",
      description: "Monitors payment milestones daily and escalates late invoices to finance and operations.",
      trigger: "cron.daily_0900",
      condition: "Payment status is PENDING and dueDate is older than 3 days",
      actions: [
        "Transition milestone status from PENDING to OVERDUE",
        "Raise high-priority card in Operator Action Center",
        "Queue gentle reminder WhatsApp notification for client account",
      ],
      enabled: true,
      runCount: 6,
      lastRunAt: new Date(now - 4 * 3600000).toISOString(),
      category: "finance",
    },
    {
      id: "rule-lead-triage",
      name: "Website Inquiry Triage & Acknowledgment",
      description: "When a visitor submits a contact form or completes the pricing estimator, instantly register and acknowledge.",
      trigger: "submission.created",
      condition: "Valid submission payload received from marketing site",
      actions: [
        "Deduplicate phone & email against existing Clients database",
        "Assign triage lead based on service interest",
        "Send immediate confirmation notification to team",
      ],
      enabled: true,
      runCount: 42,
      lastRunAt: new Date(now - 12 * 3600000).toISOString(),
      category: "crm",
    },
    {
      id: "rule-meeting-booking",
      name: "Discovery Meeting Calendar Verification",
      description: "Verifies slot availability and synchronizes requested client consultations.",
      trigger: "meeting.requested",
      condition: "Client requests appointment on public scheduler",
      actions: [
        "Validate calendar slot against existing commitments",
        "Emit system notification with meeting details & guest contact",
        "Generate Google Meet / WhatsApp conference link",
      ],
      enabled: true,
      runCount: 19,
      lastRunAt: new Date(now - 2 * 86400000).toISOString(),
      category: "delivery",
    },
  ];

  const runs: AutomationRun[] = [
    {
      id: "run-101",
      ruleId: "rule-contract-onboard",
      ruleName: "Contract Signed → Onboarding & Schedule Initialization",
      trigger: "contract.signed",
      targetEntity: "Client #9482 (Newlight Studio)",
      status: "SUCCESS",
      latencyMs: 84,
      executedAt: new Date(now - 3 * 86400000).toISOString(),
    },
    {
      id: "run-102",
      ruleId: "rule-proposal-accept",
      ruleName: "Proposal Accepted → Contract Generation",
      trigger: "proposal.accepted",
      targetEntity: "Proposal #3810",
      status: "SUCCESS",
      latencyMs: 112,
      executedAt: new Date(now - 86400000).toISOString(),
    },
    {
      id: "run-103",
      ruleId: "rule-lead-triage",
      ruleName: "Website Inquiry Triage & Acknowledgment",
      trigger: "submission.created",
      targetEntity: "Inquiry #2041 (Web Development)",
      status: "SUCCESS",
      latencyMs: 62,
      executedAt: new Date(now - 12 * 3600000).toISOString(),
    },
    {
      id: "run-104",
      ruleId: "rule-payment-overdue",
      ruleName: "Payment Overdue Auto-Escalation (>3 Days)",
      trigger: "cron.daily_0900",
      targetEntity: "Milestone Deposit #5812",
      status: "SUCCESS",
      latencyMs: 95,
      executedAt: new Date(now - 4 * 3600000).toISOString(),
    },
  ];

  const activeCount = rules.filter((r) => r.enabled).length;
  const totalRuns = rules.reduce((acc, r) => acc + r.runCount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Automations"
        description="Background business rules and event triggers that run operational loops autonomously without manual human intervention."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active Rules"
          value={`${activeCount} / ${rules.length}`}
          tone="success"
          sub="Autonomous triggers running"
        />
        <StatTile
          label="Total Executions"
          value={totalRuns}
          sub="All-time automated actions"
        />
        <StatTile
          label="Success Rate"
          value="99.4%"
          tone="success"
          sub="Zero fatal exceptions"
        />
        <StatTile
          label="Avg Latency"
          value="88ms"
          sub="Sub-100ms trigger response"
        />
      </div>

      <AutomationsClient initialRules={rules} initialRuns={runs} />
    </div>
  );
}
