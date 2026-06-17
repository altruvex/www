import { LayoutEffects } from "@/components/layout-effects";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo/json-ld";
import { VercelAnalytics } from "@/components/vercel-analytics";
import { routing } from "@/i18n/routing";
import "@/lib/env";
import { buildGlobalSchemas } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Geist_Mono, Inter, Outfit, Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: true,
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  const primaryFontVariable =
    locale === "ar" ? vazirmatn.variable : inter.variable;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const tA11y = await getTranslations({ locale, namespace: "a11y" });

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <head />
      <body
        suppressHydrationWarning
        className={cn(
          "min-h-screen flex flex-col antialiased overflow-x-auto",
          primaryFontVariable,
          outfit.variable,
          geistMono.variable,
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:inset-s-4 focus:z-100 focus:p-3 focus:px-5 focus:rounded-md focus:shadow-lg focus:border focus:border-border focus:bg-background focus:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {tA11y("skipToContent")}
        </a>
        <Script id="boot-flags" strategy="beforeInteractive">
          {`document.documentElement.setAttribute('data-js','enabled');(function(){try{var c=sessionStorage.getItem('Altruvex_initial_load_complete');if(c){document.documentElement.setAttribute('data-initial-load','complete')}}catch(e){}})();`}
        </Script>
        <JsonLd schemas={buildGlobalSchemas(locale)} />
        <NextIntlClientProvider>
          <Providers>
            <LayoutEffects>{children}</LayoutEffects>
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