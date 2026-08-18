export type LiveFeedStatus = "LIVE" | "RECENT" | "IDLE" | "UNAVAILABLE";
export type LiveMatchStatus = "SCHEDULED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED" | "CANCELLED";

export interface LiveEvent {
  id: string;
  minute: number | null;
  extraMinute: number | null;
  teamId: string;
  playerId: string | null;
  playerName: string | null;
  assistName: string | null;
  type: "GOAL" | "CARD" | "SUBSTITUTION" | "OTHER";
  detail: string;
}

export interface LiveTeamStats {
  teamId: string;
  teamName: string;
  possession: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  fouls: number | null;
  saves: number | null;
  effectiveness: number | null;
  yellowCards: number | null;
  redCards: number | null;
  offsides: number | null;
}

export interface LivePlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  started: boolean;
  minutes: number | null;
  rating: number | null;
  goals: number;
  assists: number;
  shots: number | null;
  shotsOnTarget: number | null;
  keyPasses: number | null;
  tackles: number | null;
  interceptions: number | null;
  saves: number | null;
  yellowCards: number;
  redCards: number;
}

export interface LiveMatch {
  id: string;
  kickoffAt: string;
  status: LiveMatchStatus;
  elapsed: number | null;
  homeTeam: { id: string; name: string; logoUrl: string | null };
  awayTeam: { id: string; name: string; logoUrl: string | null };
  homeScore: number | null;
  awayScore: number | null;
  events: LiveEvent[];
  teamStats: LiveTeamStats[];
  playerStats: LivePlayerStats[];
}

export interface LiveFeed {
  version: 1;
  status: LiveFeedStatus;
  provider: string;
  competition: string;
  sourceUrl: string | null;
  fetchedAt: string;
  stale: boolean;
  refreshAfterSeconds: number;
  capabilities: { scores: boolean; events: boolean; teamStats: boolean; playerStats: boolean; fantasyPoints: false };
  message: string;
  matches: LiveMatch[];
}

export function isLiveFeed(value: unknown): value is LiveFeed {
  if (!value || typeof value !== "object") return false;
  const feed = value as Partial<LiveFeed>;
  return feed.version === 1 && typeof feed.provider === "string" && typeof feed.fetchedAt === "string" && Array.isArray(feed.matches);
}
