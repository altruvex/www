import type { MetadataRoute } from "next";
import { css, PALETTE } from "@repo/ui/palette";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Altruvex  Admin",
    short_name: "Altruvex  Admin",
    description:
      "Altruvex  - Web Development Company specializing in innovative web experiences and cutting-edge applications",
    orientation: "any",
    dir: "auto",
    lang: "en-GB",
    start_url: "/",
    scope: "/",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
    ],
    theme_color: css(PALETTE.light.brand),
    background_color: css(PALETTE.light["n-0"]),
    display: "standalone",
  };
}
