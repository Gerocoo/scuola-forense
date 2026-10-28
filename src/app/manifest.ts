import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.brand,
    description: SITE.description,
    start_url: "/area",
    scope: "/",
    display: "standalone",
    background_color: "#f5f3ee",
    theme_color: "#1d5747",
    lang: "it",
    icons: [
      { src: "/brand/pronao-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/pronao-simbolo-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/pronao-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
