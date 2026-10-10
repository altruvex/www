import raw from "./quality-metrics.json";

export type QualityProject = {
  name: string;
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcpMs: number;
  cls: number;
  tbtMs: number;
};

export type QualityMetrics = {
  /** ISO date (YYYY-MM-DD) the runs were taken. */
  measuredOn: string;
  /** Tool and settings line, shown verbatim beside the date. */
  tool: string;
  projects: readonly QualityProject[];
};

/** Real Lighthouse results only. An empty `projects` list hides the block. */
export const QUALITY_METRICS: QualityMetrics = raw;
