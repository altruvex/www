import { LayoutEffects } from "@/components/layout-effects";
import { PricingTokensProvider } from "@/components/providers/pricing-tokens-provider";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo/json-ld";
import { VercelAnalytics } from "@/components/shared/vercel-analytics";
import { routing } from "@/i18n/routing";
import "@/lib/config/env";
import { InitialLoader } from "@/components/shared/initial-loader";
import { ARRIVAL_CSS, ARRIVAL_HOLD_SCRIPT } from "@/lib/motion/utils/arrival";
import { LOADER_CSS, LOADER_SCRIPT } from "@/lib/motion/utils/loader";
import { buildGlobalSchemas } from "@/lib/schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { pricingTokens, type Locale } from "@repo/pricing-schema";
import { cn } from "@/lib/utils/utils";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../globals.css";

const brandLatin = localFont({
  src: [
    {
      path: "../../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-VF.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-Italic-300.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-Italic-400.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-brand-latin",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});

const brandArabic = localFont({
  src: "../../node_modules/@repo/brand-font/dist/web/AltruvexSansArabic-VF.woff2",
  weight: "100 900",
  variable: "--font-brand-arabic",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});


type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const priceTokens = pricingTokens(locale as Locale, await getPublicPricing());

  const tA11y = await getTranslations({ locale, namespace: "a11y" });

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={cn(brandLatin.variable, brandArabic.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ARRIVAL_HOLD_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: ARRIVAL_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: LOADER_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />
      </head>
      <body
        suppressHydrationWarning
        className={cn(
          "min-h-screen flex flex-col antialiased overflow-x-auto",
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:inset-s-4 focus:z-100 focus:p-3 focus:px-5 focus:rounded-ctl-xl focus:shadow-lg focus:border focus:border-border-subtle focus:bg-background focus:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {tA11y("skipToContent")}
        </a>
        <InitialLoader />
        <Script id="boot-flags" strategy="beforeInteractive">
          {`document.documentElement.setAttribute('data-js','enabled');(function(){try{var c=sessionStorage.getItem('Altruvex_initial_load_complete');if(c){document.documentElement.setAttribute('data-initial-load','complete')}}catch(e){}})();`}
        </Script>
        <JsonLd schemas={buildGlobalSchemas(locale)} />
        <NextIntlClientProvider>
          <Providers>
            <PricingTokensProvider tokens={priceTokens}>
              <LayoutEffects>{children}</LayoutEffects>
            </PricingTokensProvider>
          </Providers>
        </NextIntlClientProvider>
        <VercelAnalytics />
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
