import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Outfit } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/env";

import { ThemeTransition } from "@repo/ui/theme-transition";
import { ThemeProvider } from "@/components/theme-provider";
import { NONCE_HEADER } from "@/lib/csp";
import { Toaster } from "@repo/ui";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
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
  // next-themes writes an inline script to set the theme before paint. Under a
  // nonce policy an inline script without the nonce does not run, and the app
  // would render in the wrong theme until hydration.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`min-h-dvh antialiased ${inter.variable} ${outfit.variable} ${geistMono.variable} font-body`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          nonce={nonce}
        >
          <ThemeTransition />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
