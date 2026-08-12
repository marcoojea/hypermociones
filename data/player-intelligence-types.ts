import type { PlayerHistoricalPerformance, PlayerMarketValue } from "@/domain/player";

export interface PlayerIntelligenceEntry {
  playerId: string;
  sourcePlayerId: string;
  sourcePlayerName: string;
  matchMethod: "EXACT" | "CLUB_ASSISTED" | "NAME_ASSISTED";
  marketValue: PlayerMarketValue | null;
  previousSeason: PlayerHistoricalPerformance | null;
}

export interface PlayerIntelligenceSnapshot {
  metadata: {
    provider: string;
    sourceUrl: string;
    license: string;
    datasetUpdatedAt: string;
    generatedAt: string;
    performanceSeason: string;
    methodVersion: string;
    matchedPlayers: number;
    playersWithPerformance: number;
    playersWithMarketValue: number;
    catalogPlayers: number;
    note: string;
  } | null;
  players: PlayerIntelligenceEntry[];
}
