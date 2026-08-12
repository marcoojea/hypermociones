import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hypermociones — Fantasy Intelligence",
    template: "%s | Hypermociones",
  },
  description:
    "Analytics explicable para tomar mejores decisiones Fantasy en LaLiga Hypermotion.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Hypermociones — Fantasy Intelligence",
    description: "Decisiones Fantasy respaldadas por datos.",
    type: "website",
    images: [{ url: "/og-optimizer.png", width: 1748, height: 909, alt: "Hypermociones — Mi equipo y optimizador Fantasy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hypermociones — Fantasy Intelligence",
    description: "Decisiones Fantasy respaldadas por datos.",
    images: ["/og-optimizer.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
