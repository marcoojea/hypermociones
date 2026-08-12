import snapshotJson from "@/data/generated/real-data.json";
import intelligenceJson from "@/data/generated/player-intelligence.json";
import rfefHistoryJson from "@/data/generated/rfef-history.json";
import type { RealDataSnapshot } from "@/data/real-data-types";
import type { PlayerIntelligenceSnapshot } from "@/data/player-intelligence-types";
import type { RfefHistorySnapshot } from "@/data/rfef-history-types";
import { enrichPlayersWithIntelligence } from "@/domain/player-intelligence";
import { queryPlayers } from "@/domain/player-query";
import type { PlayerQuery } from "@/domain/player";
import type { PlayerRepository } from "./player-repository";
import { playerRepository as seedRepository } from "./seed-player-repository";

const snapshot = snapshotJson as RealDataSnapshot;
const enrichedPlayers = enrichPlayersWithIntelligence(snapshot.players, intelligenceJson as PlayerIntelligenceSnapshot, rfefHistoryJson as RfefHistorySnapshot);

class SnapshotPlayerRepository implements PlayerRepository {
  async findMany(query: PlayerQuery = {}) { return queryPlayers(enrichedPlayers, query); }
  async findBySlug(slug: string) { return enrichedPlayers.find((player) => player.slug === slug) ?? null; }
  async listTeams() { return [...snapshot.teams].sort((a, b) => a.name.localeCompare(b.name, "es")); }
  async getProvenance() {
    if (!snapshot.metadata) throw new Error("Snapshot real no disponible");
    return { mode: "REAL" as const, provider: snapshot.metadata.provider, importedAt: snapshot.metadata.importedAt, season: snapshot.metadata.season, note: snapshot.metadata.includesPlayerAggregates ? "Plantillas, calendario y agregados reales del proveedor." : "Plantillas y calendario reales; métricas de jugador pendientes de importación." };
  }
}

export const hasRealData = snapshot.metadata !== null && snapshot.players.length > 0;
export const playerRepository: PlayerRepository = hasRealData ? new SnapshotPlayerRepository() : seedRepository;
