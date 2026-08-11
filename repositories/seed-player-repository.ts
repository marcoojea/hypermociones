import { queryPlayers } from "@/domain/player-query";
import type { PlayerQuery } from "@/domain/player";
import { seedPlayers, seedTeams } from "@/data/seed-players";
import type { PlayerRepository } from "./player-repository";

class SeedPlayerRepository implements PlayerRepository {
  async findMany(query: PlayerQuery = {}) { return queryPlayers(seedPlayers, query); }
  async findBySlug(slug: string) { return seedPlayers.find((player) => player.slug === slug) ?? null; }
  async listTeams() { return [...seedTeams].sort((a, b) => a.name.localeCompare(b.name, "es")); }
  async getProvenance() { return { mode: "DEMO" as const, provider: "seed", importedAt: null, season: "2026/27", note: "Datos ficticios de demostración; configura el proveedor para cargar datos reales." }; }
}

export const playerRepository: PlayerRepository = new SeedPlayerRepository();
