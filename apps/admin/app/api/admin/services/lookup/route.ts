import { lookupDomain } from "@/lib/rdap";
import { badRequest, ok, withAdmin } from "@/lib/with-admin";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) throw badRequest("Pass ?domain=");
  const result = await lookupDomain(domain);
  return ok({
    result: result.ok
      ? {
          ok: true,
          domain: result.domain,
          expiresAt: result.expiresAt?.toISOString() ?? null,
          registeredAt: result.registeredAt?.toISOString() ?? null,
          registrar: result.registrar,
        }
      : result,
  });
}, { can: ["create", "project"] });
