import { SITE_CONFIG, normalizeLocale } from "@/lib/metadata";
import { ImageResponse } from "next/og";

export const alt = "Altruvex social preview";
export const contentType = "image/png";
export const size = {
  height: 630,
  width: 1200,
};

export const revalidate = 86400;

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = normalizeLocale(locale);
  const isArabic = loc === "ar";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#FAFAFA",
          color: "#0F0F0F",
          display: "flex",
          fontFamily: "Helvetica, Arial, sans-serif",
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
    size,
  );
}
