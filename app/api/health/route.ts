import { getDataStatus } from "@/repositories/data-status-repository";

export function GET() {
  const data = getDataStatus();
  return Response.json({
    status: data.mode === "REAL" && data.players > 0 && data.teams > 0 && !["STALE", "UNKNOWN"].includes(data.freshness.level) ? "ok" : "degraded",
    service: "hypermociones",
    season: data.season,
    data: { provider: data.provider, importedAt: data.importedAt, freshness: data.freshness.level, teams: data.teams, players: data.players, fixtures: data.fixtures },
  }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
