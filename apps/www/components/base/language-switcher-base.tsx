"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { motion, usePress } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { SegmentedControl } from "@repo/ui/www";
import { LOCALE_META, nextLocale, type Locale } from "@/i18n/locale-meta";
import { routing } from "@/i18n/routing";

const LANGUAGES: readonly { code: Locale; nativeName: string }[] =
  routing.locales.map((code) => ({
    code,
    nativeName: LOCALE_META[code].nativeName,
  }));

interface LanguageSwitcherBaseProps {
  variant?: "inline" | "segmented";
  className?: string;
}

export function LanguageSwitcherBase({
  variant = "inline",
  className,
}: LanguageSwitcherBaseProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const pressRef = usePress<HTMLButtonElement>(motion.pressIcon());

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- pathname is dynamic at runtime
        { pathname, params },
        { locale: next },
      );
    });
  };

  if (variant === "segmented") {
    return (
      <SegmentedControl
        label={t("language")}
        value={locale as Locale}
        onChange={switchLocale}
        disabled={isPending}
        className={className}
        options={LANGUAGES.map((lang) => ({
          value: lang.code,
          label: lang.nativeName,
          lang: lang.code,
        }))}
      />
    );
  }

  const nextCode = nextLocale(locale);
  const target = LANGUAGES.find((lang) => lang.code === nextCode) ?? LANGUAGES[0];

  return (
    <button
      ref={pressRef}
      type="button"
      lang={target.code}
      onClick={() => switchLocale(target.code)}
      disabled={isPending}
      aria-busy={isPending || undefined}
      className={cn(
        "group inline-flex h-11 items-center gap-1.5 rounded-ctl-lg px-2.5 text-sm font-medium text-foreground/70 transition-[color,opacity] duration-(--motion-instant) ease-smooth hover:text-foreground disabled:opacity-60",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Globe className="size-4.5 shrink-0" aria-hidden />
      <span>{target.nativeName}</span>
    </button>
  );
}
