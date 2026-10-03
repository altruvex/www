/**
 * The scheduled jobs this deployment declares.
 *
 * The schedule itself lives in the repository's `vercel.json`, which the
 * platform reads at deploy time and this app cannot read at runtime. The entry
 * here is the human-readable copy that the Integrations and Automations
 * screens show; `bun run verify:security` fails when it drifts from the file.
 */
export interface CronJob {
  id: string;
  name: string;
  /** Route path as written in vercel.json. */
  path: string;
  /** Cron expression as written in vercel.json. */
  schedule: string;
  /** The same schedule in words. */
  scheduleText: string;
  /** Where the handler lives, so the claim is checkable. */
  source: string;
}

export const CRON_JOBS: CronJob[] = [
  {
    id: "service-renewals",
    name: "Service renewal sweep",
    path: "/api/cron/service-renewals",
    schedule: "0 6 * * *",
    scheduleText: "Daily at 06:00 UTC",
    source: "app/api/cron/service-renewals/route.ts",
  },
];
