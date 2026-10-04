export interface CronJob {
  id: string;
  name: string;
  path: string;
  schedule: string;
  scheduleText: string;
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
