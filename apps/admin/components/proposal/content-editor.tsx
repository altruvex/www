"use client";

import {
  DateInput,
  Derived,
  Field,
  ListEditor,
  NumberInput,
  Section,
  TextArea,
  TextInput,
} from "./editor-primitives";
import { PriceControl } from "./price-control";
import {
  discountAmount,
  formatPercent,
  investmentTotal,
  netTotal,
  paymentAmount,
  paymentPercentTotal,
  type ProposalContent,
  type ValidationIssue,
} from "@/lib/proposal-schema";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown currency code shouldn't blank out the live total.
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

/** Total weeks implied by the phase duration labels — same rule the deck uses. */
export function timelineWeeks(phases: { durationLabel: string }[]): number {
  const parsed = phases.map((p) => {
    const m = /^\s*(\d+(?:\.\d+)?)/.exec(p.durationLabel);
    return m ? Number(m[1]) : null;
  });
  return parsed.every((v) => v !== null)
    ? Math.round((parsed as number[]).reduce((s, v) => s + v, 0))
    : phases.length;
}

/**
 * The builder is indexed by the DECK, not by the schema.
 *
 * A proposal is seven slides. Editing it as one 800-line scroll meant the
 * operator had to hold the mapping from "the pricing table" to "slide 5" in
 * their head. Each group below is a place in the finished document, and the
 * rail shows how many problems are still in it.
 *
 * These groups change navigation only. Every field, its shape, its validation
 * and the generated deck are untouched.
 */
export const PROPOSAL_GROUPS = [
  { id: "cover", slide: "01", label: "Cover & client", blurb: "Names, date, validity, currency" },
  { id: "headings", slide: "—", label: "Slide headings", blurb: "The standing copy on every slide" },
  { id: "problems", slide: "02", label: "Project understanding", blurb: "What is wrong today" },
  { id: "solution", slide: "03", label: "Proposed solution", blurb: "Modules, targets, scores" },
  { id: "timeline", slide: "04", label: "Timeline", blurb: "Phases and weekly load" },
  { id: "investment", slide: "05", label: "Investment", blurb: "Price, discount, payment split" },
  { id: "scope", slide: "06", label: "Scope & terms", blurb: "In, out, and the key terms" },
  { id: "whyus", slide: "07", label: "Why us", blurb: "Closing argument and CTA" },
  { id: "chrome", slide: "—", label: "Labels & chrome", blurb: "Column headers and furniture" },
] as const;

export type ProposalGroupId = (typeof PROPOSAL_GROUPS)[number]["id"];

/** Which validation paths belong to which group. Prefix match, longest wins. */
const GROUP_PATHS: Record<ProposalGroupId, string[]> = {
  cover: ["meta"],
  headings: ["sections"],
  problems: ["problems"],
  solution: ["solutionModules", "performanceTargets", "performanceScores"],
  timeline: ["timelinePhases"],
  investment: ["investmentItems", "discount", "paymentSchedule"],
  scope: ["scopeIncluded", "scopeNotIncluded", "keyTerms"],
  whyus: ["whyUs"],
  chrome: ["labels"],
};

/** Issues no group claims. Without this they would be invisible in the rail. */
export function unassignedIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const prefixes = Object.values(GROUP_PATHS).flat();
  return issues.filter(
    (issue) =>
      !prefixes.some(
        (prefix) => issue.path === prefix || issue.path.startsWith(`${prefix}.`),
      ),
  );
}

/** Issue count per group, so the rail can say where the problems actually are. */
export function groupIssueCounts(issues: ValidationIssue[]): Record<ProposalGroupId, number> {
  const counts = Object.fromEntries(
    PROPOSAL_GROUPS.map((g) => [g.id, 0]),
  ) as Record<ProposalGroupId, number>;

  for (const issue of issues) {
    for (const group of PROPOSAL_GROUPS) {
      const owns = GROUP_PATHS[group.id].some(
        (prefix) => issue.path === prefix || issue.path.startsWith(`${prefix}.`),
      );
      if (owns) {
        counts[group.id] += 1;
        break;
      }
    }
  }
  return counts;
}

const SECTION_KEYS = [
  { key: "problems", label: "Slide 2 — Project understanding" },
  { key: "solution", label: "Slide 3 — Proposed solution" },
  { key: "timeline", label: "Slide 4 — Timeline" },
  { key: "investment", label: "Slide 5 — Investment" },
  { key: "scope", label: "Slide 6 — Scope & terms" },
  { key: "closing", label: "Slide 7 — Why us" },
] as const;

type SectionKey = (typeof SECTION_KEYS)[number]["key"];

export function ProposalContentEditor({
  content,
  onChange,
  issues,
  activeGroup,
}: {
  content: ProposalContent;
  onChange: (content: ProposalContent) => void;
  issues: ValidationIssue[];
  activeGroup: ProposalGroupId;
}) {
  const show = (group: ProposalGroupId) => activeGroup === group;
  const set = <K extends keyof ProposalContent>(key: K, value: ProposalContent[K]) =>
    onChange({ ...content, [key]: value });

  const setSection = (key: SectionKey, patch: Record<string, string>) =>
    onChange({
      ...content,
      sections: { ...content.sections, [key]: { ...content.sections[key], ...patch } },
    });

  const setLabels = (patch: Partial<ProposalContent["labels"]>) =>
    onChange({ ...content, labels: { ...content.labels, ...patch } });

  const issuesFor = (prefix: string) =>
    issues.filter((issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`));

  const sectionError = (prefix: string) => issuesFor(prefix)[0]?.message;

  const currency = content.meta.currency;
  const subtotal = investmentTotal(content.investmentItems);
  const reduction = discountAmount(content.investmentItems, content.discount);
  const total = netTotal(content.investmentItems, content.discount);
  const percentTotal = paymentPercentTotal(content.paymentSchedule);
  const percentOk = Math.abs(percentTotal - 100) < 0.001;

  return (
    <div className="space-y-3">
      {show("cover") && (
      <Section title="Client & proposal" description="Cover slide and dates.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client name (cover subtitle)" error={sectionError("meta.clientName")}>
            <TextInput
              value={content.meta.clientName}
              onChange={(v) => set("meta", { ...content.meta, clientName: v })}
              placeholder="Ali Abdelhadi – Newlight"
            />
          </Field>
          <Field label="Client company (cover headline)" error={sectionError("meta.clientCompany")}>
            <TextInput
              value={content.meta.clientCompany}
              onChange={(v) => set("meta", { ...content.meta, clientCompany: v })}
              placeholder="Newlight"
            />
          </Field>
          <Field
            label="Project label"
            hint="Rendered uppercase under the client name."
            error={sectionError("meta.projectLabel")}
            className="sm:col-span-2"
          >
            <TextInput
              value={content.meta.projectLabel}
              onChange={(v) => set("meta", { ...content.meta, projectLabel: v })}
              placeholder="Custom E-commerce System Platform"
            />
          </Field>
          <Field label="Proposal date" error={sectionError("meta.proposalDate")}>
            <DateInput
              value={content.meta.proposalDate}
              onChange={(v) => set("meta", { ...content.meta, proposalDate: v })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Validity (days)" error={sectionError("meta.validityDays")}>
              <NumberInput
                value={content.meta.validityDays}
                min={1}
                max={365}
                onChange={(v) => set("meta", { ...content.meta, validityDays: v })}
              />
            </Field>
            <Field label="Currency" error={sectionError("meta.currency")}>
              <TextInput
                value={currency}
                onChange={(v) => set("meta", { ...content.meta, currency: v.toUpperCase() })}
                placeholder="EGP"
              />
            </Field>
          </div>
        </div>
      </Section>
      )}


      {show("chrome") && (
      <Section
        title="Table & chrome labels"
        description="Column headers, block labels and cover wording — the document's furniture. {date}, {weeks} and {n} are filled in when the deck is built; keep them in the text."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cover eyebrow" error={sectionError("labels.cover.eyebrow")}>
            <TextInput
              value={content.labels.cover.eyebrow}
              onChange={(v) => setLabels({ cover: { ...content.labels.cover, eyebrow: v } })}
              invalid={!content.labels.cover.eyebrow.includes("{date}")}
            />
          </Field>
          <Field label="Prepared-for label" error={sectionError("labels.cover.preparedFor")}>
            <TextInput
              value={content.labels.cover.preparedFor}
              onChange={(v) => setLabels({ cover: { ...content.labels.cover, preparedFor: v } })}
            />
          </Field>
          <Field label="Cover title line 1" error={sectionError("labels.cover.titleLine1")}>
            <TextInput
              value={content.labels.cover.titleLine1}
              onChange={(v) => setLabels({ cover: { ...content.labels.cover, titleLine1: v } })}
            />
          </Field>
          <Field
            label="Cover title line 2 (accent)"
            hint="Georgia italic, the muted cover tone."
            error={sectionError("labels.cover.titleLine2")}
          >
            <TextInput
              value={content.labels.cover.titleLine2}
              onChange={(v) => setLabels({ cover: { ...content.labels.cover, titleLine2: v } })}
            />
          </Field>
          <Field label="Footer company" error={sectionError("labels.footerCompany")}>
            <TextInput
              value={content.labels.footerCompany}
              onChange={(v) => setLabels({ footerCompany: v })}
            />
          </Field>
          <Field label="Performance targets label">
            <TextInput
              value={content.labels.performanceTargets}
              onChange={(v) => setLabels({ performanceTargets: v })}
            />
          </Field>
          <Field label="Weekly load label">
            <TextInput
              value={content.labels.weeklyLoad}
              onChange={(v) => setLabels({ weeklyLoad: v })}
            />
          </Field>
          <Field label="Weekly load tick" error={sectionError("labels.weeklyLoadTick")}>
            <TextInput
              value={content.labels.weeklyLoadTick}
              onChange={(v) => setLabels({ weeklyLoadTick: v })}
              invalid={!content.labels.weeklyLoadTick.includes("{n}")}
            />
          </Field>
          <Field
            label="Timeline total line"
            error={sectionError("labels.timelineTotal")}
            className="sm:col-span-2"
          >
            <TextInput
              value={content.labels.timelineTotal}
              onChange={(v) => setLabels({ timelineTotal: v })}
              invalid={!content.labels.timelineTotal.includes("{weeks}")}
            />
          </Field>
          <Field label="Item column">
            <TextInput
              value={content.labels.investmentItem}
              onChange={(v) => setLabels({ investmentItem: v })}
            />
          </Field>
          <Field label="Amount column">
            <TextInput
              value={content.labels.investmentAmount}
              onChange={(v) => setLabels({ investmentAmount: v })}
            />
          </Field>
          <Field label="Total row label">
            <TextInput
              value={content.labels.investmentTotal}
              onChange={(v) => setLabels({ investmentTotal: v })}
            />
          </Field>
          <Field label="Payment split label">
            <TextInput
              value={content.labels.paymentSplit}
              onChange={(v) => setLabels({ paymentSplit: v })}
            />
          </Field>
          <Field
            label="Valid-until line"
            error={sectionError("labels.validUntil")}
            className="sm:col-span-2"
          >
            <TextInput
              value={content.labels.validUntil}
              onChange={(v) => setLabels({ validUntil: v })}
              invalid={!content.labels.validUntil.includes("{date}")}
            />
          </Field>
          <Field label="Included column">
            <TextInput
              value={content.labels.scopeIncluded}
              onChange={(v) => setLabels({ scopeIncluded: v })}
            />
          </Field>
          <Field label="Not-included column">
            <TextInput
              value={content.labels.scopeNotIncluded}
              onChange={(v) => setLabels({ scopeNotIncluded: v })}
            />
          </Field>
          <Field label="Key terms label">
            <TextInput
              value={content.labels.keyTerms}
              onChange={(v) => setLabels({ keyTerms: v })}
            />
          </Field>
        </div>
      </Section>
      )}


      {show("headings") && (
      <Section
        title="Section headings"
        description="The standing copy on each slide. Same for every client unless you change it here."
      >
        <div className="space-y-4">
          {SECTION_KEYS.map(({ key, label }) => {
            const section = content.sections[key];
            return (
              <div key={key} className="space-y-2 rounded-md border border-border bg-surface/50 p-2.5">
                <div className="telemetry text-subtle-foreground">{label}</div>
                <TextInput
                  value={section.eyebrow}
                  onChange={(v) => setSection(key, { eyebrow: v })}
                  placeholder="02 — Project Understanding"
                  invalid={!section.eyebrow.trim()}
                  ariaLabel={`${label} — eyebrow`}
                />
                {key === "closing" ? (
                  <TextInput
                    value={content.sections.closing.heading}
                    onChange={(v) => setSection("closing", { heading: v })}
                    placeholder="Why Altruvex"
                    invalid={!content.sections.closing.heading.trim()}
                    ariaLabel={`${label} — heading`}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <TextInput
                      value={(section as { lead: string }).lead}
                      onChange={(v) => setSection(key, { lead: v })}
                      placeholder="What we'll "
                      invalid={!(section as { lead: string }).lead.trim()}
                      className="flex-1"
                      ariaLabel={`${label} — heading lead-in`}
                    />
                    <TextInput
                      value={(section as { accent: string }).accent}
                      onChange={(v) => setSection(key, { accent: v })}
                      placeholder="build."
                      invalid={!(section as { accent: string }).accent.trim()}
                      className="w-44"
                      ariaLabel={`${label} — accent word`}
                    />
                  </div>
                )}
                {key === "problems" && (
                  <>
                    <TextArea
                      value={content.sections.problems.intro}
                      onChange={(v) => setSection("problems", { intro: v })}
                      rows={2}
                      placeholder="Intro line under the heading"
                      invalid={!content.sections.problems.intro.trim()}
                      ariaLabel="Project understanding — intro line"
                    />
                    <TextArea
                      value={content.sections.problems.quote}
                      onChange={(v) => setSection("problems", { quote: v })}
                      rows={2}
                      placeholder="Pull quote at the foot of the slide"
                      invalid={!content.sections.problems.quote.trim()}
                      ariaLabel="Project understanding — pull quote"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-meta text-subtle-foreground">
          The second box on each heading is the accent word — it renders in Georgia italic in the
          brand color, so keep the punctuation with it (&ldquo;build.&rdquo;, not &ldquo;build&rdquo;).
        </p>
      </Section>
      )}


      {show("problems") && (
      <Section title="Problems" description="Slide 2 — the read on what's wrong today.">
        <ListEditor
          items={content.problems}
          onChange={(v) => set("problems", v)}
          makeItem={() => ({ title: "", description: "" })}
          addLabel="Add problem"
          emptyHint={sectionError("problems")}
          renderItem={(item, i, update) => (
            <div className="space-y-2">
              <TextInput
                value={item.title}
                onChange={(v) => update({ title: v })}
                placeholder="Problem title"
                invalid={!item.title.trim()}
              />
              <TextArea
                value={item.description}
                onChange={(v) => update({ description: v })}
                rows={2}
                placeholder="What it costs the business"
                invalid={!item.description.trim()}
              />
            </div>
          )}
        />
      </Section>
      )}


      {show("solution") && (
      <Section title="Solution modules" description="Slide 3 — the cards.">
        <ListEditor
          items={content.solutionModules}
          onChange={(v) => set("solutionModules", v)}
          makeItem={() => ({ title: "", description: "" })}
          addLabel="Add module"
          emptyHint={sectionError("solutionModules")}
          renderItem={(item, i, update) => (
            <div className="space-y-2">
              <TextInput
                value={item.title}
                onChange={(v) => update({ title: v })}
                placeholder="Module title"
                invalid={!item.title.trim()}
              />
              <TextArea
                value={item.description}
                onChange={(v) => update({ description: v })}
                rows={2}
                placeholder="What it does"
                invalid={!item.description.trim()}
              />
            </div>
          )}
        />
      </Section>
      )}


      {show("solution") && (
      <Section title="Performance targets" description="Slide 3 — the mono row above the bars.">
        <ListEditor
          items={content.performanceTargets}
          onChange={(v) => set("performanceTargets", v)}
          makeItem={() => ({ label: "" })}
          addLabel="Add target"
          emptyHint={sectionError("performanceTargets")}
          renderItem={(item, i, update) => (
            <TextInput
              value={item.label}
              onChange={(v) => update({ label: v })}
              placeholder="<2S LOAD TIME"
              invalid={!item.label.trim()}
            />
          )}
        />
      </Section>
      )}


      {show("solution") && (
      <Section title="Performance scores" description="Slide 3 — bar length is the score.">
        <ListEditor
          items={content.performanceScores}
          onChange={(v) => set("performanceScores", v)}
          makeItem={() => ({ label: "", score: 90 })}
          addLabel="Add score"
          emptyHint={sectionError("performanceScores")}
          renderItem={(item, i, update) => (
            <div className="flex items-center gap-3">
              <TextInput
                value={item.label}
                onChange={(v) => update({ label: v })}
                placeholder="Performance"
                invalid={!item.label.trim()}
                className="flex-1"
              />
              <NumberInput
                value={item.score}
                min={0}
                max={100}
                suffix="%"
                onChange={(v) => update({ score: v })}
                invalid={!(item.score >= 0 && item.score <= 100)}
                className="w-28"
              />
            </div>
          )}
        />
      </Section>
      )}


      {show("timeline") && (
      <Section
        title="Timeline"
        description="Slide 4 — one row and one load bar per phase."
        action={
          <span className="telemetry text-subtle-foreground">
            Total{" "}
            <span className="text-foreground">{timelineWeeks(content.timelinePhases)}</span> weeks
          </span>
        }
      >
        <ListEditor
          items={content.timelinePhases}
          onChange={(v) => set("timelinePhases", v)}
          makeItem={() => ({ name: "", deliverable: "", durationLabel: "1W", weeklyLoad: 50 })}
          addLabel="Add phase"
          emptyHint={sectionError("timelinePhases")}
          renderItem={(item, i, update) => (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <TextInput
                  value={item.name}
                  onChange={(v) => update({ name: v })}
                  placeholder="Discovery"
                  invalid={!item.name.trim()}
                  className="flex-1"
                />
                <TextInput
                  value={item.durationLabel}
                  onChange={(v) => update({ durationLabel: v })}
                  placeholder="1W"
                  invalid={!item.durationLabel.trim()}
                  className="w-20"
                />
                <NumberInput
                  value={item.weeklyLoad}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => update({ weeklyLoad: v })}
                  invalid={!(item.weeklyLoad >= 0 && item.weeklyLoad <= 100)}
                  className="w-28"
                />
              </div>
              <TextInput
                value={item.deliverable}
                onChange={(v) => update({ deliverable: v })}
                placeholder="Brief confirmed, structure set"
                invalid={!item.deliverable.trim()}
              />
            </div>
          )}
        />
        <p className="text-meta text-subtle-foreground">
          Duration is the label on the row; load (0–100%) is the bar height on the weekly-load
          chart — a one-week phase can still be the heaviest week.
        </p>
      </Section>
      )}


      {show("investment") && (
      <>
      <Section
        title="Price"
        description="Set the number, or take a discount off it. Everything below follows."
        action={
          <span className="telemetry text-subtle-foreground">
            {reduction > 0 ? "Client pays" : "Total"}{" "}
            <span className="text-foreground">{formatCurrency(total, currency)}</span>
          </span>
        }
      >
        <PriceControl content={content} onChange={onChange} issues={issues} />
      </Section>

      <Section
        title="Investment"
        description="Slide 5 — line items and the payment split."
        action={
          <span className="telemetry text-subtle-foreground">
            Subtotal <span className="text-foreground">{formatCurrency(subtotal, currency)}</span>
          </span>
        }
      >
        <ListEditor
          items={content.investmentItems}
          onChange={(v) => set("investmentItems", v)}
          makeItem={() => ({ item: "", amount: 0 })}
          addLabel="Add line item"
          emptyHint={sectionError("investmentItems")}
          renderItem={(item, i, update) => (
            // Stacked below sm: at 375px a fixed-width amount field squeezes
            // the name into an unreadable sliver, and the name is the half you
            // are reading when you scan a price table.
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              <TextInput
                value={item.item}
                onChange={(v) => update({ item: v })}
                placeholder="Design & Brand System"
                invalid={!item.item.trim()}
                className="w-full sm:flex-1"
              />
              <NumberInput
                value={item.amount}
                min={0}
                onChange={(v) => update({ amount: Math.round(v) })}
                invalid={!(item.amount >= 0)}
                className="w-full sm:w-40"
              />
            </div>
          )}
        />

        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold">Payment schedule</h4>
            <span
              className={cn(
                "font-mono text-meta tabular-nums",
                percentOk ? "text-success" : "text-danger",
              )}
            >
              {formatPercent(percentTotal)}% of 100%
            </span>
          </div>

          <ListEditor
            items={content.paymentSchedule}
            onChange={(v) => set("paymentSchedule", v)}
            makeItem={() => ({ label: "", trigger: "", percent: 0 })}
            addLabel="Add payment"
            emptyHint={sectionError("paymentSchedule")}
            renderItem={(item, i, update) => (
              <div className="space-y-2">
                {/* Three controls on one line only survive from sm up. Below
                    that the milestone name wraps to its own row and the
                    percentage and its derived amount share the next one. */}
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                  <TextInput
                    value={item.label}
                    onChange={(v) => update({ label: v })}
                    placeholder="First Payment"
                    invalid={!item.label.trim()}
                    className="w-full sm:flex-1"
                  />
                  <NumberInput
                    value={item.percent}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(v) => update({ percent: v })}
                    invalid={!(item.percent >= 0 && item.percent <= 100)}
                    className="w-24 sm:w-28"
                  />
                  {/* Derived, never editable — a stored amount drifts the
                      moment a line item changes. */}
                  <Derived className="flex-1 sm:w-32 sm:flex-none">
                    {formatCurrency(paymentAmount(content, item.percent), currency)}
                  </Derived>
                </div>
                <TextInput
                  value={item.trigger}
                  onChange={(v) => update({ trigger: v })}
                  placeholder="Upon signing + confirmed brief"
                  invalid={!item.trigger.trim()}
                />
              </div>
            )}
          />

          {!percentOk && (
            <p className="rounded-md border border-danger/25 bg-danger/[0.06] px-2.5 py-2 text-base text-danger">
              Percentages must total exactly 100% before the proposal can be generated.
            </p>
          )}

          {reduction > 0 && (
            <p className="text-meta text-subtle-foreground">
              Instalments are percentages of the discounted total (
              {formatCurrency(total, currency)}), not of the{" "}
              {formatCurrency(subtotal, currency)} subtotal.
            </p>
          )}
        </div>
      </Section>
      </>
      )}


      {show("scope") && (
      <Section title="Scope" description="Slide 6 — the two bullet columns.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-base font-semibold">Included</h4>
            <ListEditor
              items={content.scopeIncluded}
              onChange={(v) => set("scopeIncluded", v)}
              makeItem={() => ""}
              addLabel="Add"
              emptyHint={sectionError("scopeIncluded")}
              renderItem={(item, i) => (
                <TextInput
                  value={item}
                  onChange={(v) =>
                    set(
                      "scopeIncluded",
                      content.scopeIncluded.map((s, si) => (si === i ? v : s)),
                    )
                  }
                  placeholder="Custom design & development"
                  invalid={!item.trim()}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-semibold">Not included</h4>
            <ListEditor
              items={content.scopeNotIncluded}
              onChange={(v) => set("scopeNotIncluded", v)}
              makeItem={() => ""}
              addLabel="Add"
              emptyHint={sectionError("scopeNotIncluded")}
              renderItem={(item, i) => (
                <TextInput
                  value={item}
                  onChange={(v) =>
                    set(
                      "scopeNotIncluded",
                      content.scopeNotIncluded.map((s, si) => (si === i ? v : s)),
                    )
                  }
                  placeholder="Branding from scratch"
                  invalid={!item.trim()}
                />
              )}
            />
          </div>
        </div>
      </Section>
      )}


      {show("scope") && (
      <Section title="Key terms" description="Slide 6 — the label/value table.">
        <ListEditor
          items={content.keyTerms}
          onChange={(v) => set("keyTerms", v)}
          makeItem={() => ({ label: "", value: "" })}
          addLabel="Add term"
          emptyHint={sectionError("keyTerms")}
          renderItem={(item, i, update) => (
            <div className="flex items-start gap-3">
              <TextInput
                value={item.label}
                onChange={(v) => update({ label: v })}
                placeholder="Validity"
                invalid={!item.label.trim()}
                className="w-40 shrink-0"
              />
              <TextArea
                value={item.value}
                onChange={(v) => update({ value: v })}
                rows={2}
                placeholder="Proposal valid for 30 days from the proposal date."
                invalid={!item.value.trim()}
              />
            </div>
          )}
        />
      </Section>
      )}


      {show("whyus") && (
      <Section title="Why us" description="Slide 7 — headline, paragraph and value props.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Headline line 1" error={sectionError("whyUs.headlineLine1")}>
            <TextInput
              value={content.whyUs.headlineLine1}
              onChange={(v) => set("whyUs", { ...content.whyUs, headlineLine1: v })}
              placeholder="We don't build templates."
            />
          </Field>
          <Field
            label="Headline line 2 (accent)"
            hint="Rendered in the brand accent, Georgia italic."
            error={sectionError("whyUs.headlineLine2")}
          >
            <TextInput
              value={content.whyUs.headlineLine2}
              onChange={(v) => set("whyUs", { ...content.whyUs, headlineLine2: v })}
              placeholder="We engineer systems."
            />
          </Field>
        </div>
        <Field label="Paragraph" error={sectionError("whyUs.paragraph")}>
          <TextArea
            value={content.whyUs.paragraph}
            onChange={(v) => set("whyUs", { ...content.whyUs, paragraph: v })}
            rows={4}
          />
        </Field>
        <Field
          label="CTA question"
          hint="The line inside the bordered box at the foot of slide 7."
          error={sectionError("whyUs.cta")}
        >
          <TextInput
            value={content.whyUs.cta}
            onChange={(v) => set("whyUs", { ...content.whyUs, cta: v })}
            placeholder="Ready to build the system your business deserves?"
            invalid={!content.whyUs.cta.trim()}
          />
        </Field>
        <Field label="Value props" error={sectionError("whyUs.valueProps")}>
          <ListEditor
            items={content.whyUs.valueProps}
            onChange={(v) => set("whyUs", { ...content.whyUs, valueProps: v })}
            makeItem={() => ""}
            addLabel="Add value prop"
            renderItem={(item, i) => (
              <TextInput
                value={item}
                onChange={(v) =>
                  set("whyUs", {
                    ...content.whyUs,
                    valueProps: content.whyUs.valueProps.map((s, si) => (si === i ? v : s)),
                  })
                }
                invalid={!item.trim()}
              />
            )}
          />
        </Field>
      </Section>
      )}


    </div>
  );
}
