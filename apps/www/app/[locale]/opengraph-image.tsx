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
    <div
      style={{
        alignItems: "stretch",
        background:
          "linear-gradient(135deg, #f3efe7 0%, #e7dfd0 45%, #d7c9b0 100%)",
        color: "#17130d",
        display: "flex",
        fontFamily: "Arial, sans-serif",
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
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div
              style={{
                color: "#5d5140",
                display: "flex",
                fontSize: 28,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {isArabic ? "استوديو هندسة ويب" : "Web Engineering Studio"}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 86,
                fontWeight: 700,
                letterSpacing: "-0.06em",
              }}
            >
              {SITE_CONFIG.name}
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              background: "rgba(23,19,13,0.08)",
              border: "1px solid rgba(23,19,13,0.12)",
              borderRadius: 999,
              color: "#5d5140",
              display: "flex",
              fontSize: 24,
              height: 52,
              letterSpacing: "0.08em",
              padding: "0 20px",
              textTransform: "uppercase",
            }}
          >
            {isArabic ? "القاهرة" : "Cairo"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: 880,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              textAlign: isArabic ? "right" : "left",
            }}
          >
            {isArabic
              ? "هندسة ويب دقيقة للأنظمة ثنائية اللغة الموجّهة للأعمال."
              : "Precision web engineering for bilingual B2B systems."}
          </div>
          <div
            style={{
              color: "#4d4336",
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 960,
              textAlign: isArabic ? "right" : "left",
            }}
          >
            {isArabic
              ? "تطوير ويب مخصص وNext.js واستشارات تقنية للفرق التي تحتاج أداءً ومصداقيةً وجودة تنفيذ من اليوم الأول."
              : "Custom web development, Next.js delivery, and technical consulting for teams that need performance, credibility, and clean execution."}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            color: "#5d5140",
            display: "flex",
            fontSize: 26,
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex" }}>
            {(SITE_CONFIG.url ?? "altruvex.com").replace(/^https?:\/\//, "")}
          </div>
          <div style={{ display: "flex" }}>
            {isArabic ? "العربية + English" : "English + العربية"}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
