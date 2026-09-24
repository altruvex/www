/**
 * Reading a domain's expiry from its registry, over RDAP.
 *
 * RDAP is the registries' own structured replacement for WHOIS: public, free,
 * no account. rdap.org redirects each query to the registry that is
 * authoritative for the TLD, so the date comes from the source rather than
 * from a reseller's dashboard.
 *
 * Its limits are stated rather than papered over: not every ccTLD publishes
 * RDAP (.eg does not), and hosting, email and certificates have no equivalent
 * at all. When the registry says nothing, the caller is told so and the date
 * stays whatever the operator typed — never a guess.
 */

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
/** DNS caps a name at 253 characters. */
const MAX_DOMAIN_LENGTH = 253;

/** Lowercase, scheme and path stripped: "https://www.Nile.com/x" → "www.nile.com". */
export function normaliseDomain(input: string): string | null {
  const trimmed = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
  return trimmed.length <= MAX_DOMAIN_LENGTH && DOMAIN_PATTERN.test(trimmed) ? trimmed : null;
}

export interface RegistryRecord {
  expiresAt: Date | null;
  registeredAt: Date | null;
  registrar: string | null;
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, [string, unknown, string, unknown][]];
}

const eventDate = (events: RdapEvent[], action: string): Date | null => {
  const raw = events.find((event) => event.eventAction === action)?.eventDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Pure: the fields this app uses out of an RDAP domain response. */
export function parseRdapDomain(json: unknown): RegistryRecord {
  const body = (json ?? {}) as { events?: RdapEvent[]; entities?: RdapEntity[] };
  const events = Array.isArray(body.events) ? body.events : [];
  const registrarEntity = (Array.isArray(body.entities) ? body.entities : []).find((entity) =>
    entity.roles?.includes("registrar"),
  );
  const fn = registrarEntity?.vcardArray?.[1]?.find((field) => field[0] === "fn")?.[3];
  return {
    expiresAt: eventDate(events, "expiration"),
    registeredAt: eventDate(events, "registration"),
    registrar: typeof fn === "string" && fn.trim() ? fn.trim() : null,
  };
}

export type RegistryLookup =
  | ({ ok: true; domain: string } & RegistryRecord)
  | { ok: false; reason: string };

/**
 * Looks a domain up. Never throws: every failure is a reason for the screen.
 *
 * The host is fixed and the domain is validated before it is put in the URL,
 * so this cannot be pointed at anything but a registry.
 */
export async function lookupDomain(input: string): Promise<RegistryLookup> {
  const domain = normaliseDomain(input);
  if (!domain) return { ok: false, reason: `"${input}" is not a domain name.` };

  let response: Response;
  try {
    response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { accept: "application/rdap+json" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "The registry did not answer in time. Try again, or type the date." };
  }

  if (response.status === 404) {
    const tld = domain.split(".").pop();
    return {
      ok: false,
      reason: `The .${tld} registry does not publish expiry dates over RDAP, or the domain is not registered. Type the date from the registrar.`,
    };
  }
  if (!response.ok) {
    return { ok: false, reason: `The registry refused the lookup (${response.status}). Type the date from the registrar.` };
  }

  const record = parseRdapDomain(await response.json().catch(() => null));
  if (!record.expiresAt) {
    return { ok: false, reason: "The registry answered but gave no expiry date. Type it from the registrar." };
  }
  return { ok: true, domain, ...record };
}
