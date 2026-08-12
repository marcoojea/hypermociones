import type { PlayerHistoricalPerformance, PlayerListItem, Position } from "./player";
import type { PlayerIntelligenceSnapshot } from "@/data/player-intelligence-types";
import type { RfefHistorySnapshot, RfefHistoricalPlayer } from "@/data/rfef-history-types";

const percentile = (value: number, population: readonly number[]) => {
  if (population.length <= 1) return 50;
  const below = population.filter((candidate) => candidate < value).length;
  const equal = population.filter((candidate) => candidate === value).length;
  return Math.round(((below + Math.max(0, equal - 1) / 2) / (population.length - 1)) * 100);
};
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

function impactWeights(position: Position) {
  if (position === "POR") return { goals: 0, assists: 0, relevance: .8, discipline: .2 };
  if (position === "DEF") return { goals: .25, assists: .2, relevance: .4, discipline: .15 };
  if (position === "MED") return { goals: .2, assists: .35, relevance: .35, discipline: .1 };
  return { goals: .45, assists: .25, relevance: .25, discipline: .05 };
}

function baseHistorical(stats: RfefHistoricalPlayer) {
  const seasonMatches = /segunda/i.test(stats.competition) ? 42 : 38;
  const competitionFactor = /primera divisi[oó]n/i.test(stats.competition) ? 1.08 : /segunda divisi[oó]n/i.test(stats.competition) ? 1 : /primera federaci[oó]n/i.test(stats.competition) ? .85 : /segunda federaci[oó]n/i.test(stats.competition) ? .7 : .8;
  const goalsPer90 = stats.goals * 90 / stats.minutes * competitionFactor;
  const assistsPer90 = stats.assists * 90 / stats.minutes * competitionFactor;
  const appearanceRate = Math.min(100, stats.appearances / seasonMatches * 100);
  const minuteShare = Math.min(100, stats.minutes / (seasonMatches * 90) * 100);
  const relevance = minuteShare * .6 + appearanceRate * .2 + Math.min(100, stats.starts / seasonMatches * 100) * .2;
  const discipline = Math.max(0, 100 - ((stats.yellowCards + stats.redCards * 3) / Math.max(stats.appearances, 1)) * 45);
  return { goalsPer90, assistsPer90, appearanceRate, minuteShare, relevance, discipline };
}

export function enrichPlayersWithIntelligence(players: readonly PlayerListItem[], openData: PlayerIntelligenceSnapshot, rfef: RfefHistorySnapshot) {
  const openById = new Map(openData.players.map((entry) => [entry.playerId, entry]));
  const rfefById = new Map(rfef.players.map((entry) => [entry.playerId, entry]));
  const positionById = new Map(players.map((player) => [player.id, player.position]));
  const rfefPrepared = rfef.players.map((stats) => ({ stats, position: positionById.get(stats.playerId), base: baseHistorical(stats) })).filter((item): item is typeof item & { position: Position } => Boolean(item.position));
  const populations = new Map<Position, { goals: number[]; assists: number[]; relevance: number[]; discipline: number[]; market: number[] }>();
  for (const position of ["POR", "DEF", "MED", "DEL"] as Position[]) populations.set(position, { goals: [], assists: [], relevance: [], discipline: [], market: [] });
  for (const item of rfefPrepared) {
    const values = populations.get(item.position)!;
    values.goals.push(item.base.goalsPer90); values.assists.push(item.base.assistsPer90); values.relevance.push(item.base.relevance); values.discipline.push(item.base.discipline);
  }
  for (const player of players) {
    const market = openById.get(player.id)?.marketValue;
    if (market) populations.get(player.position)!.market.push(market.amountEur);
  }
  return players.map((player): PlayerListItem => {
    const open = openById.get(player.id);
    const rfefStats = rfefById.get(player.id);
    let previousSeason: PlayerHistoricalPerformance | null = open?.previousSeason ? { ...open.previousSeason, starts: open.previousSeason.starts ?? null } : null;
    if (rfefStats) {
      const base = baseHistorical(rfefStats);
      const population = populations.get(player.position)!;
      const weights = impactWeights(player.position);
      const rawImpact = percentile(base.goalsPer90, population.goals) * weights.goals + percentile(base.assistsPer90, population.assists) * weights.assists
        + percentile(base.relevance, population.relevance) * weights.relevance + percentile(base.discipline, population.discipline) * weights.discipline;
      const sampleWeight = Math.min(1, rfefStats.minutes / 900);
      previousSeason = { season: rfefStats.season, competitions: [rfefStats.competition], clubNames: [], appearances: rfefStats.appearances, starts: rfefStats.starts,
        minutes: rfefStats.minutes, goals: rfefStats.goals, assists: rfefStats.assists, yellowCards: rfefStats.yellowCards, redCards: rfefStats.redCards,
        goalsPer90: round(base.goalsPer90, 2), assistsPer90: round(base.assistsPer90, 2), contributionsPer90: round(base.goalsPer90 + base.assistsPer90, 2),
        appearanceRate: Math.round(base.appearanceRate), minuteShare: Math.round(base.minuteShare), relevanceScore: Math.round(base.relevance), impactScore: Math.round(50 + (rawImpact - 50) * sampleWeight),
        confidence: rfefStats.minutes >= 900 ? "HIGH" : rfefStats.minutes >= 270 ? "MEDIUM" : "LOW", source: "RFEF / ficha pública de competición", sourceUrl: rfefStats.sourceUrl };
    }
    const marketValue = open?.marketValue ? { ...open.marketValue, positionPercentile: percentile(open.marketValue.amountEur, populations.get(player.position)!.market) } : null;
    return { ...player, marketValue, previousSeason };
  });
}
