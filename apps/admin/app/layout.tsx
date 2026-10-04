import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";
import "@/lib/env";

import { ThemeProvider } from "@/components/theme-provider";
import { NONCE_HEADER } from "@/lib/csp";
import { Toaster } from "@repo/ui";

const brandLatin = localFont({
  src: [
    {
      path: "../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-VF.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-Italic-400.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-brand-latin",
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

const brandArabic = localFont({
  src: "../node_modules/@repo/brand-font/dist/web/AltruvexSansArabic-VF.woff2",
  weight: "100 900",
  variable: "--font-brand-arabic",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Altruvex OS",
    template: "%s · Altruvex OS",
  },
  description:
    "The internal operating system of Altruvex: leads, proposals, contracts, delivery and finance in one place.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${brandLatin.variable} ${brandArabic.variable}`}
    >
      <body className="min-h-dvh antialiased font-body">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          nonce={nonce}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
