import { sweepServiceRenewals } from "@/lib/client-services";
import { ok, withAdmin } from "@/lib/with-admin";

export const dynamic = "force-dynamic";

export const POST = withAdmin(async () => {
  const result = await sweepServiceRenewals();
  return ok({ result });
}, { can: ["edit", "project"] });
