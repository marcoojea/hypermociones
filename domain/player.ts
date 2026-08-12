export const positions = ["POR", "DEF", "MED", "DEL"] as const;
export const playerStatuses = ["AVAILABLE", "DOUBTFUL", "INJURED", "SUSPENDED", "UNKNOWN"] as const;

export type Position = (typeof positions)[number];
export type PlayerStatus = (typeof playerStatuses)[number];

export interface TeamSummary {
  id: string; name: string; shortName: string; slug: string; primaryColor: string; crestUrl?: string | null;
}

export type IntelligenceConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface PlayerMarketValue {
  amountEur: number;
  valuedAt: string;
  positionPercentile?: number;
  source: string;
  sourceUrl: string;
}

export interface PlayerHistoricalPerformance {
  season: string;
  competitions: readonly string[];
  clubNames: readonly string[];
  appearances: number;
  starts: number | null;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  goalsPer90: number;
  assistsPer90: number;
  contributionsPer90: number;
  appearanceRate: number;
  minuteShare: number;
  relevanceScore: number;
  impactScore: number;
  confidence: IntelligenceConfidence;
  source: string;
  sourceUrl: string;
}

export interface PlayerListItem {
  id: string; slug: string; name: string; shirtNumber: number | null; nationality: string; age: number | null;
  heightCm?: number | null; weightKg?: number | null;
  position: Position; status: PlayerStatus; team: TeamSummary;
  appearances: number | null; starts: number | null; minutes: number | null; goals: number | null; assists: number | null;
  xg: number | null; xa: number | null; xgi: number | null; shots: number | null; keyPasses: number | null; cleanSheets: number | null;
  yellowCards?: number | null; redCards?: number | null;
  fantasyPoints: number | null; pointsPerGame: number | null; form: number | null; fis: number | null;
  marketValue?: PlayerMarketValue | null;
  previousSeason?: PlayerHistoricalPerformance | null;
  nextOpponent: string | null; fixtureDifficulty: number | null;
  recentMinutes: readonly number[]; recentPoints: readonly number[];
  strengths: readonly string[]; risks: readonly string[];
}

export interface DataProvenance {
  mode: "REAL" | "DEMO";
  provider: string;
  importedAt: string | null;
  season: string;
  note: string;
}

export type PlayerSort = "name" | "fis" | "form" | "minutes" | "xgi" | "points";
export type SortDirection = "asc" | "desc";
export interface PlayerQuery {
  search?: string; team?: string; position?: Position; status?: PlayerStatus;
  sort?: PlayerSort; direction?: SortDirection;
}
