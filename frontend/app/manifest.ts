import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "15 Palle - Billiard Club & Bar",
    short_name: "15 Palle",
    description: "Billiard club e bar a Bolzano con tavoli professionali e community.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020817",
    theme_color: "#1f7db2",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}
