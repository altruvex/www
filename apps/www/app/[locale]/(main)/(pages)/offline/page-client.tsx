"use client";

import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { useRouter } from "@/i18n/navigation";
import { WifiOff } from "lucide-react";
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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background overflow-hidden">
      <Container>
        <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto">
          <div className="mb-10 relative">
            <div className="w-20 h-20 rounded-sm border border-foreground/8 bg-foreground/2 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-primary/30" strokeWidth={1.5} />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-foreground/8 bg-foreground/2 px-3 py-1.5 mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70">
              {t("status")}
            </span>
          </div>
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
          {stillOffline && (
            <div className="mb-6 px-4 py-2.5 rounded-sm border border-destructive/30 bg-destructive/8">
              <p className="font-mono text-sm leading-normal tracking-wider text-destructive/80 uppercase">
                Still offline - please check your connection
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
            <MagneticButton
              size="lg"
              variant="primary"
              onClick={handleRetry}
              className="justify-center sm:w-auto"
            >
              {t("tryAgain")}
            </MagneticButton>
            <MagneticButton
              size="lg"
              variant="secondary"
              onClick={() => window.history.back()}
              className="justify-center sm:w-auto"
            >
              {t("goBack")}
            </MagneticButton>
          </div>
        </div>
      </Container>
    </div>
  );
}
