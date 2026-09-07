import { SITE_CONFIG, normalizeLocale } from "@/lib/metadata";
import { ImageResponse } from "next/og";

export const alt = "Altruvex social preview";
export const contentType = "image/png";
export const size = {
  height: 630,
  width: 1200,
};

export const revalidate = 86400;

async function loadGoogleFont(family: string, weight: number, text: string) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11",
    },
  }).then((res) => res.text());

  const fontUrlMatch = css.match(/url\((https:\/\/[^)]+)\)/);
  if (!fontUrlMatch) {
    throw new Error(`Could not find font URL for ${family}`);
  }

  const fontRes = await fetch(fontUrlMatch[1]);
  return fontRes.arrayBuffer();
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = normalizeLocale(locale);

  /**
   * Satori — the renderer behind `ImageResponse` — performs no bidi
   * reordering, so Arabic lays out in logical (LTR) word order: the heading
   * reads "مخصصة ويب مواقع تطوير" instead of "تطوير مواقع ويب مخصصة".
   * Letterforms and joining are correct; only word order is wrong, and
   * neither `direction: rtl` nor a `dir` attribute changes it — both render
   * byte-identical output.
   *
   * Rather than publish a share card that reads backwards, /ar serves the
   * English card until bidi is supported upstream. Flip this to `true` to
   * restore the Arabic layout — every RTL branch below is still wired up.
   */
  const BIDI_SUPPORTED: boolean = false;
  const isArabic = BIDI_SUPPORTED && loc === "ar";

  const text =
    "استوديو تطوير ويب القاهرة تطوير مواقع ويب مخصصة للأنظمة متعددة اللغات الموجّهة للأعمال تطوير ويب مخصص وNext.js واستشارات تقنية للفرق التي تحتاج أداءً ومصداقيةً وجودة تنفيذ من اليوم الأول العربية + English Web Engineering Studio Cairo Custom web development for multilingual B2B systems Architecture-first builds Performance by default Founder-direct English + العربية " +
    SITE_CONFIG.name +
    (SITE_CONFIG.url ?? "altruvex.com");

  const [interRegular, interBold, vazirmatnRegular, vazirmatnBold] =
    await Promise.all([
      loadGoogleFont("Inter", 400, text),
      loadGoogleFont("Inter", 700, text),
      loadGoogleFont("Vazirmatn", 400, text),
      loadGoogleFont("Vazirmatn", 700, text),
    ]);

  const fontFamily = isArabic ? "Vazirmatn" : "Inter";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#FAFAFA",
          color: "#0F0F0F",
          display: "flex",
          fontFamily,
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                color: "#737373",
                display: "flex",
                fontSize: 24,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              {isArabic ? "استوديو تطوير ويب" : "WEB ENGINEERING STUDIO"}
            </div>
            <div
              style={{
                alignItems: "center",
                background: "rgba(15,15,15,0.06)",
                border: "1px solid rgba(15,15,15,0.1)",
                borderRadius: 999,
                color: "#525252",
                display: "flex",
                fontSize: 22,
                height: 48,
                letterSpacing: "0.08em",
                padding: "0 18px",
                textTransform: "uppercase",
              }}
            >
              {isArabic ? "القاهرة" : "CAIRO"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "22px",
              maxWidth: 920,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 58,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1.04,
                textAlign: isArabic ? "right" : "left",
              }}
            >
              {isArabic
                ? "تطوير مواقع ويب مخصصة للأنظمة متعددة اللغات الموجّهة للأعمال."
                : "Custom web development for multilingual B2B systems."}
            </div>
            <div
              style={{
                color: "#525252",
                display: "flex",
                fontSize: 28,
                lineHeight: 1.4,
                maxWidth: 920,
                textAlign: isArabic ? "right" : "left",
              }}
            >
              {isArabic
                ? "تطوير ويب مخصص وNext.js واستشارات تقنية للفرق التي تحتاج أداءً ومصداقيةً وجودة تنفيذ من اليوم الأول."
                : "Architecture-first builds. Performance by default. Founder-direct."}
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                textTransform: "uppercase",
              }}
            >
              {SITE_CONFIG.name}
            </div>
            <div
              style={{
                color: "#737373",
                display: "flex",
                fontSize: 22,
                gap: "16px",
              }}
            >
              <span>
                {(SITE_CONFIG.url ?? "altruvex.com").replace(
                  /^https?:\/\//,
                  "",
                )}
              </span>
              <span style={{ color: "#0E70F1" }}>
                {isArabic ? "العربية + English" : "English + العربية"}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { data: interRegular, name: "Inter", style: "normal", weight: 400 },
        { data: interBold, name: "Inter", style: "normal", weight: 700 },
        {
          data: vazirmatnRegular,
          name: "Vazirmatn",
          style: "normal",
          weight: 400,
        },
        {
          data: vazirmatnBold,
          name: "Vazirmatn",
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
