import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hypermociones — Fantasy Intelligence",
    short_name: "Hypermociones",
    description: "Analytics explicable y optimización Fantasy para LaLiga Hypermotion.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f4ee",
    theme_color: "#151b16",
    lang: "es",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
