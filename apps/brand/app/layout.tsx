import type { Metadata } from "next";
import localFont from "next/font/local";
import { Shell } from "@/components/shell";
import { cn } from "@/lib/cn";
import "./globals.css";

// Same faces, same files, same variables as apps/www/app/[locale]/layout.tsx.
const brandLatin = localFont({
  src: [
    { path: "../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-VF.woff2", weight: "100 900", style: "normal" },
    { path: "../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-Italic-300.woff2", weight: "300", style: "italic" },
    { path: "../node_modules/@repo/brand-font/dist/web/AltruvexSansLatin-Italic-400.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-brand-latin",
  display: "optional",
  adjustFontFallback: false,
});

const brandArabic = localFont({
  src: "../node_modules/@repo/brand-font/dist/web/AltruvexSansArabic-VF.woff2",
  weight: "100 900",
  variable: "--font-brand-arabic",
  display: "optional",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: "Altruvex Brand", template: "%s · Altruvex Brand" },
  description: "The Altruvex identity, rendered from the live tokens, and every place the code leaves it.",
  robots: { index: false, follow: false },
};

// Sets the theme class before paint so a stored dark preference does not flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("brand-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={cn(brandLatin.variable, brandArabic.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
