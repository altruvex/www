import { sweepServiceRenewals } from "@/lib/client-services";
import { ok, withAdmin } from "@/lib/with-admin";

/**
 * "Check renewals now" — the renewal sweep, run by an operator.
 *
 * The scheduled run lives at /api/cron/service-renewals. This is the same
 * function behind a session instead of a secret, so the alerts can be raised
 * on a deployment with no scheduler configured, and so the button reports what
 * it actually wrote rather than a green toast over nothing.
 */

export const dynamic = "force-dynamic";

export const POST = withAdmin(async () => {
  const result = await sweepServiceRenewals();
  return ok({ result });
});
