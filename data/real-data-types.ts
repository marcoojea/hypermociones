import type { FixtureListItem } from "@/domain/fixture";
import type { PlayerListItem, TeamSummary } from "@/domain/player";

export interface RealDataSnapshot {
  metadata: {
    provider: string;
    competitionCode: string;
    competitionExternalId: string;
    seasonExternalId: string;
    season: string;
    startsOn: string;
    endsOn: string;
    importedAt: string;
    includesPlayerAggregates: boolean;
    unavailableMetrics: readonly string[];
    // Teams whose RFEF roster was empty in this import and kept the previous one.
    carriedOverTeams?: readonly string[];
  } | null;
  teams: TeamSummary[];
  players: PlayerListItem[];
  fixtures: FixtureListItem[];
  fixturesSource?: {
    provider: string;
    leagueId: string;
    season: string;
    fetchedAt: string;
    rounds: number;
    matches: number;
    attribution: string;
  } | null;
}
