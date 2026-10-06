export type Severity = "error" | "warn" | "info";

export type Category =
  | "color"
  | "radius"
  | "border"
  | "typography"
  | "hierarchy"
  | "motion"
  | "logo"
  | "image"
  | "rtl"
  | "reuse";

export type AppName = "www" | "admin" | "ui" | "brand";

export interface Rule {
  /** kebab-case, stable, e.g. "color-hex-literal" */
  id: string;
  category: Category;
  severity: Severity;
  /** short, plain English */
  title: string;
  /** one sentence, cites the source doc/rule */
  why: string;
  /** one sentence, the token/utility to use instead */
  fix: string;
  /** repo-relative doc path the rule comes from */
  source: string;
  /** which apps it applies to */
  apps: AppName[];
}

export interface Finding {
  ruleId: string;
  app: AppName;
  /** repo-relative */
  file: string;
  /** 1-based */
  line: number;
  /** 1-based */
  column: number;
  /** the offending text */
  match: string;
  /** the trimmed source line (≤ 200 chars) */
  snippet: string;
}

export interface AuditReport {
  /** ISO */
  generatedAt: string;
  scanned: { app: AppName; files: number }[];
  rules: Rule[];
  findings: Finding[];
}
