import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GA Real Estate Exam Study Guide",
    short_name: "RE Study Guide",
    description: "Georgia Real Estate Salesperson Licensing — Interactive Study Guide",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f11",
    theme_color: "#0f0f11",
    icons: [
      {
        src: "/favicons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
