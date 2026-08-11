import type { PlayerStatus, Position } from "@/domain/player";

export interface ProviderCompetition {
  externalId: string; code: string; name: string; countryCode: string;
  season: { externalId: string; name: string; startsOn: string; endsOn: string; currentRound: number | null };
}

export interface ProviderPlayer {
  externalId: string; teamExternalId: string; name: string; position: Position;
  rawPosition: string | null; shirtNumber: number | null; nationality: string | null; birthDate: string | null;
  age?: number | null; heightCm?: number | null; weightKg?: number | null; status?: PlayerStatus;
}

export interface ProviderTeam {
  externalId: string; name: string; shortName: string; tla: string | null; crestUrl: string | null;
  players: readonly ProviderPlayer[];
}

export interface ProviderFixture {
  externalId: string; round: number | null; kickoffAt: string; status: string;
  homeTeamExternalId: string; awayTeamExternalId: string;
  homeScore: number | null; awayScore: number | null;
}

export interface ProviderPlayerAggregate {
  playerExternalId: string; appearances: number | null; starts: number | null; minutes: number | null;
  goals: number | null; assists: number | null; shots?: number | null; keyPasses?: number | null;
  yellowCards?: number | null; redCards?: number | null;
}

export interface FootballDataProvider {
  readonly code: string;
  getCompetition(seasonStartYear: number): Promise<ProviderCompetition>;
  getTeams(seasonStartYear: number): Promise<readonly ProviderTeam[]>;
  getFixtures(seasonStartYear: number): Promise<readonly ProviderFixture[]>;
  getPlayerAggregate(playerExternalId: string, competition: ProviderCompetition): Promise<ProviderPlayerAggregate>;
}
