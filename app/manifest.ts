import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Austra Training Institute",
    short_name: "ATI",
    description:
      "Austra Training Institute staff portal.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0B1F3A",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}