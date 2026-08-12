import type { MetadataRoute } from "next";
import { playerRepository } from "@/repositories/snapshot-player-repository";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hypermociones-2627.marcoojea97.chatgpt.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [players, teams, provenance] = await Promise.all([
    playerRepository.findMany(), playerRepository.listTeams(), playerRepository.getProvenance(),
  ]);
  const lastModified = provenance.importedAt ? new Date(provenance.importedAt) : new Date();
  const publicRoutes = ["", "/players", "/teams", "/fixtures", "/lineups", "/data-status", "/methodology", "/privacy", "/terms", "/contact"];
  return [
    ...publicRoutes.map((route) => ({ url: `${siteUrl}${route}`, lastModified, changeFrequency: "weekly" as const, priority: route === "" ? 1 : .7 })),
    ...players.map((player) => ({ url: `${siteUrl}/player/${player.slug}`, lastModified, changeFrequency: "weekly" as const, priority: .6 })),
    ...teams.map((team) => ({ url: `${siteUrl}/team/${team.slug}`, lastModified, changeFrequency: "weekly" as const, priority: .7 })),
  ];
}
