import snapshotJson from "@/data/generated/real-data.json";
import type { RealDataSnapshot } from "@/data/real-data-types";
import { queryPlayers } from "@/domain/player-query";
import type { PlayerQuery } from "@/domain/player";
import type { PlayerRepository } from "./player-repository";
import { playerRepository as seedRepository } from "./seed-player-repository";

const snapshot = snapshotJson as RealDataSnapshot;

class SnapshotPlayerRepository implements PlayerRepository {
  async findMany(query: PlayerQuery = {}) { return queryPlayers(snapshot.players, query); }
  async findBySlug(slug: string) { return snapshot.players.find((player) => player.slug === slug) ?? null; }
  async listTeams() { return [...snapshot.teams].sort((a, b) => a.name.localeCompare(b.name, "es")); }
  async getProvenance() {
    if (!snapshot.metadata) throw new Error("Snapshot real no disponible");
    return { mode: "REAL" as const, provider: snapshot.metadata.provider, importedAt: snapshot.metadata.importedAt, season: snapshot.metadata.season, note: snapshot.metadata.includesPlayerAggregates ? "Plantillas, calendario y agregados reales del proveedor." : "Plantillas y calendario reales; métricas de jugador pendientes de importación." };
  }
}

export const hasRealData = snapshot.metadata !== null && snapshot.players.length > 0;
export const playerRepository: PlayerRepository = hasRealData ? new SnapshotPlayerRepository() : seedRepository;
