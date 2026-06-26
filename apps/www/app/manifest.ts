import {
  MANIFEST_BACKGROUND_COLOR,
  MANIFEST_THEME_COLOR,
} from "@/lib/config/brand-manifest";
import { SITE_CONFIG } from "@/lib/metadata";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: MANIFEST_BACKGROUND_COLOR,
    description: SITE_CONFIG.description.en,
    dir: "auto",
    display: "standalone",
    icons: [
      {
        sizes: "180x180",
        src: "/apple-touch-icon.png",
        type: "image/png",
      },
      {
        sizes: "192x192",
        src: "/web-app-manifest-192x192.png",
        type: "image/png",
      },
      {
        sizes: "512x512",
        src: "/web-app-manifest-512x512.png",
        type: "image/png",
      },
    ],
    lang: "en",
    name: SITE_CONFIG.name,
    orientation: "any",
    scope: "/",
    short_name: SITE_CONFIG.name,
    start_url: "/en?source=pwa",
    theme_color: MANIFEST_THEME_COLOR,
  };
}
