import type { DataProvenance, PlayerListItem, PlayerQuery, TeamSummary } from "@/domain/player";

export interface PlayerRepository {
  findMany(query?: PlayerQuery): Promise<PlayerListItem[]>;
  findBySlug(slug: string): Promise<PlayerListItem | null>;
  listTeams(): Promise<TeamSummary[]>;
  getProvenance(): Promise<DataProvenance>;
}
