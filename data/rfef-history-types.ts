export interface RfefHistoricalPlayer {
  playerId: string;
  sourcePlayerId: string;
  teamId: string;
  competition: string;
  season: string;
  appearances: number;
  substituteAppearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  sourceUrl: string;
}

export interface RfefHistorySnapshot {
  metadata: {
    provider: string;
    importedAt: string;
    season: string;
    matchedPlayers: number;
    catalogPlayers: number;
    note: string;
  } | null;
  players: RfefHistoricalPlayer[];
}
