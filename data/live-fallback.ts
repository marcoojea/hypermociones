import type { LiveFeed, LiveMatch } from "@/domain/live";

const sourceUrl = "https://www.laliga.com/laliga-hypermotion/resultados/2026-27/jornada-1";
const capturedAt = "2026-08-18T14:25:00.000Z";

const results = [
  ["2026-08-14T20:30:00+02:00", "Real Sociedad B", "CD Castellón", 0, 1, [40.8, 59.2, 4, 13, 0, 11.1, 22, 21, 5, 1, 2, 4, 0, 0, 5, 8]],
  ["2026-08-15T17:00:00+02:00", "FC Andorra", "AD Ceuta FC", 5, 1, [62.9, 37.1, 25, 5, 20.8, 25, 22, 8, 2, 1, 3, 1, 0, 0, 2, 2]],
  ["2026-08-15T19:00:00+02:00", "Cádiz CF", "Celta Fortuna", 0, 0, [57, 43, 17, 5, 0, 0, 14, 21, 3, 1, 4, 3, 0, 0, 6, 2]],
  ["2026-08-15T19:00:00+02:00", "Real Oviedo", "Granada CF", 0, 0, [61, 39, 9, 10, 0, 0, 17, 13, 1, 0, 2, 3, 0, 0, 3, 2]],
  ["2026-08-15T21:30:00+02:00", "RCD Mallorca", "Real Valladolid CF", 2, 0, [47.3, 52.7, 7, 12, 40, 0, 14, 12, 1, 0, 2, 2, 0, 0, 3, 3]],
  ["2026-08-16T17:00:00+02:00", "SD Eibar", "CD Tenerife", 1, 3, [65.1, 34.9, 16, 7, 7.7, 42.9, 12, 14, 1, 2, 0, 1, 0, 0, 7, 3]],
  ["2026-08-16T19:00:00+02:00", "Burgos CF", "Córdoba CF", 3, 2, [41.5, 58.5, 13, 20, 23.1, 12.5, 14, 11, 2, 1, 1, 3, 0, 0, 1, 7]],
  ["2026-08-16T19:00:00+02:00", "Girona FC", "CD Leganés", 1, 1, [69, 31, 27, 5, 5.9, 20, 6, 16, 1, 1, 2, 3, 0, 0, 9, 0]],
  ["2026-08-16T21:30:00+02:00", "UD Las Palmas", "Albacete BP", 2, 1, [66.1, 33.9, 12, 12, 20, 12.5, 6, 16, 3, 4, 1, 2, 0, 0, 3, 6]],
  ["2026-08-17T19:00:00+02:00", "Real Sporting", "CE Sabadell", 0, 0, [55.9, 44.1, 8, 15, 0, 0, 7, 20, 2, 6, 1, 3, 0, 0, 1, 8]],
  ["2026-08-17T21:30:00+02:00", "UD Almería", "CD Eldense", 3, 0, [56.6, 43.4, 15, 11, 25, 0, 7, 12, 2, 1, 1, 3, 0, 0, 7, 8]],
] as const;

const matches: LiveMatch[] = results.map(([kickoffAt, home, away, homeScore, awayScore, stats], index) => ({
  id: `laliga-2627-j1-${index + 1}`,
  kickoffAt,
  status: "FINISHED",
  elapsed: null,
  homeTeam: { id: slug(home), name: home, logoUrl: null },
  awayTeam: { id: slug(away), name: away, logoUrl: null },
  homeScore,
  awayScore,
  events: [],
  teamStats: [teamStats(home, stats, 0), teamStats(away, stats, 1)],
  playerStats: [],
}));

export function buildVerifiedResultsFallback(reason: string): LiveFeed {
  return {
    version: 1,
    status: "RECENT",
    provider: "LALIGA · verificación manual",
    competition: "LALIGA HYPERMOTION",
    sourceUrl,
    fetchedAt: capturedAt,
    stale: true,
    refreshAfterSeconds: 900,
    capabilities: { scores: true, events: false, teamStats: true, playerStats: false, fantasyPoints: false },
    message: `${reason} Se muestran resultados y estadísticas de equipo de la jornada 1, verificados en LALIGA el 18/08/2026; no son una captura en directo.`,
    matches,
  };
}

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function teamStats(teamName: string, stats: readonly number[], side: 0 | 1) {
  return {
    teamId: slug(teamName),
    teamName,
    possession: stats[side],
    shots: stats[2 + side],
    shotsOnTarget: null,
    effectiveness: stats[4 + side],
    fouls: stats[6 + side],
    offsides: stats[8 + side],
    yellowCards: stats[10 + side],
    redCards: stats[12 + side],
    corners: stats[14 + side],
    saves: null,
  };
}
