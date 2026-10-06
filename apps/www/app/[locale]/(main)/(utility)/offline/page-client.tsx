"use client";

import { Container } from "@/components/shared/container";
import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow } from "@repo/ui/www";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function OfflinePage() {
  const router = useRouter();
  const t = useTranslations("offline");
  const [stillOffline, setStillOffline] = useState(false);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.refresh();
    } else {
      setStillOffline(true);
      setTimeout(() => setStillOffline(false), 4000);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto">
          <Eyebrow className="mb-8">{t("status")}</Eyebrow>
          <h1
            className="mb-6 font-sans font-normal text-primary leading-[1.03]"
            style={{
              fontSize: "clamp(36px, 6vw, 72px)",
              letterSpacing: "-0.025em",
            }}
          >
            {t("title")}
          </h1>
          <p className="mb-4 text-base text-primary/60 leading-relaxed max-w-[40ch]">
            {t("description")} {t("description2")}
          </p>
          <p aria-live="polite" className="mb-6 min-h-5 text-sm text-destructive">
            {stillOffline ? t("stillOffline") : null}
          </p>
          <MagneticButton
            size="lg"
            variant="primary"
            onClick={handleRetry}
            className="justify-center sm:w-auto"
          >
            {t("tryAgain")}
          </MagneticButton>
        </div>
      </Container>
    </div>
  );
}
