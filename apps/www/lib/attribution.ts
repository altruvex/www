// First-touch attribution: where a visitor first landed and what sent them.
// Captured once in localStorage, sent with every lead POST, never overwritten
// until it expires. Storage can be blocked, so every access is guarded.

const STORAGE_KEY = "altruvex.first-touch";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

type Attribution = {
  landingPath: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  firstSeenAt: string | null;
};

const EMPTY: Attribution = {
  landingPath: null,
  referrer: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  firstSeenAt: null,
};

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

/** The stored first touch, or all nulls when there is none (or storage is blocked). */
function readAttribution(): Attribution {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Record<keyof Attribution, unknown>>;
    const firstSeenAt = text(parsed.firstSeenAt, 40);
    if (!firstSeenAt || Date.now() - Date.parse(firstSeenAt) > EXPIRY_MS) {
      return EMPTY;
    }
    return {
      landingPath: text(parsed.landingPath, 300),
      referrer: text(parsed.referrer, 500),
      utmSource: text(parsed.utmSource, 120),
      utmMedium: text(parsed.utmMedium, 120),
      utmCampaign: text(parsed.utmCampaign, 120),
      firstSeenAt,
    };
  } catch {
    return EMPTY;
  }
}

/** The external referrer host + path, or null for direct and same-site visits. */
function externalReferrer(): string | null {
  if (!document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    if (url.origin === window.location.origin) return null;
    return `${url.host}${url.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

/** Records the first touch once; a later call never overwrites a live one. */
export function captureAttribution(): void {
  try {
    if (readAttribution().firstSeenAt) return;
    const params = new URLSearchParams(window.location.search);
    const touch: Attribution = {
      landingPath: text(window.location.pathname, 300),
      referrer: externalReferrer(),
      utmSource: text(params.get("utm_source"), 120),
      utmMedium: text(params.get("utm_medium"), 120),
      utmCampaign: text(params.get("utm_campaign"), 120),
      firstSeenAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(touch));
  } catch {
    // Blocked storage: the lead simply arrives without a first touch.
  }
}

/** The fields a lead POST carries: first-touch values that exist, nothing else. */
export function attributionPayload() {
  const { landingPath, referrer, utmSource, utmMedium, utmCampaign } =
    readAttribution();
  return {
    ...(landingPath && { landingPath }),
    ...(referrer && { referrer }),
    ...(utmSource && { utmSource }),
    ...(utmMedium && { utmMedium }),
    ...(utmCampaign && { utmCampaign }),
  };
}
