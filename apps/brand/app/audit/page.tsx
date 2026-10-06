import type { Metadata } from "next";
import { AuditView, type ViewFinding, type ViewRule } from "@/components/audit-view";
import { PageHeader } from "@/components/page";
import { runAudit } from "@/lib/audit";
import { editorHref } from "@/lib/repo";

export const metadata: Metadata = { title: "Drift audit" };

/** Every load rescans the source, so a fix shows up on the next refresh. */
export const dynamic = "force-dynamic";

export default async function AuditPage(): Promise<React.ReactElement> {
  const report = await runAudit();

  const rules: ViewRule[] = report.rules.map((r) => ({ ...r, sourceHref: editorHref(r.source) }));
  const findings: ViewFinding[] = report.findings.map((f) => ({
    ...f,
    href: editorHref(f.file, f.line, f.column),
  }));

  return (
    <>
      <PageHeader
        index="08 — Drift audit"
        title="What leaves the identity"
        lede={
          <>
            A scan of the www, admin and ui source against the rules this app documents. Every row opens the
            file at the line in the editor. Fix it, refresh, and it drops off. A deliberate exception is marked in
            the source with <code className="whitespace-nowrap text-foreground">brand-allow: rule-id</code> on the line or the line
            above it.
          </>
        }
      />
      <AuditView
        rules={rules}
        findings={findings}
        scanned={report.scanned}
        generatedAt={report.generatedAt}
      />
    </>
  );
}
