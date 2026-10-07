import { z } from "zod";

// Optional first-touch fields a lead POST may carry (lib/attribution.ts).
// Over-long values are cut, not refused: attribution must never fail a lead.
const field = (max: number) =>
  z.preprocess(
    (val) => (typeof val === "string" ? val.trim().slice(0, max) || undefined : undefined),
    z.string().optional(),
  );

const attributionSchema = z.object({
  utmSource: field(120),
  utmMedium: field(120),
  utmCampaign: field(120),
  referrer: field(500),
  landingPath: field(300),
});

/** Body first-touch values, each undefined when absent or malformed. */
export function parseAttribution(body: unknown) {
  const parsed = attributionSchema.safeParse(body);
  return parsed.success ? parsed.data : {};
}

/**
 * The Referer header only when it names another site. A same-origin Referer is
 * just the form page, which says nothing about where the visitor came from.
 */
export function externalReferer(request: Request): string | undefined {
  const referer = request.headers.get("referer");
  if (!referer) return undefined;
  try {
    const from = new URL(referer);
    if (from.host === new URL(request.url).host || from.host === request.headers.get("host")) {
      return undefined;
    }
    return referer.slice(0, 500);
  } catch {
    return undefined;
  }
}
