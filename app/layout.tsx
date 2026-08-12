import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hypermociones-2627.marcoojea97.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Hypermociones",
  title: {
    default: "Hypermociones — Fantasy Intelligence",
    template: "%s | Hypermociones",
  },
  description:
    "Analytics explicable para tomar mejores decisiones Fantasy en LaLiga Hypermotion.",
  keywords: ["LaLiga Hypermotion", "Fantasy Football", "alineaciones probables", "Segunda División", "analytics fútbol"],
  category: "sports",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Hypermociones — Fantasy Intelligence",
    description: "Decisiones Fantasy respaldadas por datos.",
    type: "website",
    url: siteUrl,
    siteName: "Hypermociones",
    locale: "es_ES",
    images: [{ url: new URL("/og-launch.png", siteUrl).toString(), width: 1680, height: 945, alt: "Hypermociones — Fantasy Intelligence para LaLiga Hypermotion" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hypermociones — Fantasy Intelligence",
    description: "Decisiones Fantasy respaldadas por datos.",
    images: [new URL("/og-launch.png", siteUrl).toString()],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#151b16", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = { "@context": "https://schema.org", "@type": "WebApplication", name: "Hypermociones", url: siteUrl, applicationCategory: "SportsApplication", operatingSystem: "Web", description: "Analytics explicable y optimización Fantasy para LaLiga Hypermotion." };
  return <html lang="es"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
