import type { TeamSummary } from "./player";

export type FixtureStatus = "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED";

export interface FixtureListItem {
  id: string;
  externalId: string;
  round: number | null;
  kickoffAt: string;
  status: FixtureStatus;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  homeScore: number | null;
  awayScore: number | null;
}
