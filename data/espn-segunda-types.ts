// Shapes of the files written by scripts/sync-espn-segunda.ts. Source: unofficial ESPN API (esp.2).
// Missing values are null or absent, never zero.

export interface SyncMetadata {
  fetchedAt: string;
  source: string;
  season: string;
  errors: string[];
}

export interface SyncTeamStats {
  possessionPct: number | null;
  totalShots: number | null;
  shotsOnTarget: number | null;
  foulsCommitted: number | null;
  yellowCards: number | null;
  redCards: number | null;
  wonCorners: number | null;
  offsides: number | null;
  saves: number | null;
}

export interface SyncPlayerStat {
  teamName: string;
  name: string;
  espnId: string | null;
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
  // Minutes from substitution minutes; null when the match has no substitution data. Extra time not counted.
  minutes: number | null;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  totalShots: number;
  shotsOnTarget: number;
  saves: number;
  goalsConceded: number;
}

export interface SyncEvent {
  minute: string | null;
  type: string;
  text: string;
  teamName: string | null;
  scoring: boolean;
  card: "YELLOW" | "RED" | null;
}

export interface SyncSideLineup { starters: string[]; bench: string[] }

export interface SyncMatch {
  espnId: string;
  date: string | null;
  state: "pre" | "in" | "post" | null;
  completed: boolean;
  home: { name: string; score: number | null };
  away: { name: string; score: number | null };
  // Round taken from our calendar (real-data.json fixtures). Null when the match could not be matched.
  round: number | null;
  // Null when the XI is not published (fewer than 11 starters).
  lineups: { home: SyncSideLineup | null; away: SyncSideLineup | null };
  events: SyncEvent[];
  teamStats: { home: SyncTeamStats | null; away: SyncTeamStats | null };
  players: SyncPlayerStat[];
}

export interface SyncedMatches {
  metadata: SyncMetadata;
  matches: SyncMatch[];
}

export interface SyncInjury {
  teamName: string;
  name: string;
  espnId: string | null;
  // ESPN status type as reported, e.g. "active", "injured". Anything other than "active" is not treated as available.
  status: string;
  detail: string | null;
}

export interface SyncedInjuries {
  metadata: SyncMetadata;
  // Empty list means ESPN reported nothing; it does not prove there are no injuries.
  injuries: SyncInjury[];
}

export interface SyncNewsArticle {
  headline: string;
  published: string;
  link: string | null;
  // Keyword hint only. Must be shown as "pendiente de confirmar".
  injuryCandidate: boolean;
}

export interface SyncedNews {
  metadata: SyncMetadata;
  articles: SyncNewsArticle[];
}

export interface SyncRosterAthlete {
  espnId: string;
  name: string;
  position: string | null;
  jersey: string | null;
  // ESPN status type as reported; "unknown" when ESPN sends none. Anything other than "active" is not available.
  status: string;
  injuryDetail: string | null;
}

export interface SyncRosterTeam {
  teamName: string;
  espnTeamId: string;
  athletes: SyncRosterAthlete[];
}

export interface SyncedRosters {
  metadata: SyncMetadata;
  // A team whose roster fetch failed keeps its previous entry.
  teams: SyncRosterTeam[];
}
