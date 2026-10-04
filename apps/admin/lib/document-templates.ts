import { money } from "@/lib/format";
import { contractDraft, proposalDraft, type EmailDraft } from "@/lib/email-templates";

export interface DocumentFacts {
  clientName: string | null;
  projectType?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  link: string;
}

function withDetail(draft: EmailDraft, intro: string, detail: string[]): EmailDraft {
  if (detail.length === 0) return draft;
  const lines = draft.body.split("\n");
  const at = lines.findIndex((line) => line === intro);
  if (at === -1) return draft;
  lines.splice(at + 1, 0, ...detail);
  return { subject: draft.subject, body: lines.join("\n") };
}

export function proposalEmailTemplate(facts: DocumentFacts): EmailDraft {
  const base = proposalDraft(facts.clientName, facts.link);
  const type = facts.projectType?.trim();
  const amount =
    facts.totalPrice != null && facts.currency ? money(facts.totalPrice, facts.currency) : null;
  const detail = [
    ...(type ? [`Project: ${type}`] : []),
    ...(amount ? [`Proposed total: ${amount}`] : []),
  ];
  const draft = withDetail(base, "Your proposal is ready. It is here:", detail);
  return type ? { ...draft, subject: `Your proposal from Altruvex: ${type}` } : draft;
}

export function contractEmailTemplate(facts: DocumentFacts): EmailDraft {
  const base = contractDraft(facts.clientName, facts.link);
  const type = facts.projectType?.trim();
  const draft = withDetail(
    base,
    "Your contract is ready to sign. Open it here:",
    type ? [`Project: ${type}`] : [],
  );
  return type ? { ...draft, subject: `Your contract from Altruvex: ${type}` } : draft;
}
