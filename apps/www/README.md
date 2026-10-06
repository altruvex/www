# apps/www

The public marketing site: Next.js (App Router), `next-intl` (`en` default, `ar`), MDX articles.

```bash
turbo run dev --filter=www   # http://localhost:3010
```

Motion is documented in `MOTION.md`.

All text uses Altruvex Sans (`packages/brand-font`, an OFL derivative of Outfit and Vazirmatn), loaded with `next/font/local` behind `--font-brand` in `app/[locale]/layout.tsx` and `app/globals.css`. It is the only web font the site loads: `font-sans` and `font-mono` both resolve to it. The one exception is the Latin emphasis clause in a heading (`Highlight` in `packages/ui/src/www/emphasis.tsx`), which is Georgia italic through `--font-serif`: a system font, so nothing is downloaded. Arabic emphasis is the brand face in bold. Code is set in the brand face; there is no monospace token. Components never name a font family.
