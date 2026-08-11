import snapshotJson from "@/data/generated/real-data.json";
import type { RealDataSnapshot } from "@/data/real-data-types";
import type { FixtureListItem } from "@/domain/fixture";
import type { DataProvenance } from "@/domain/player";

export interface FixtureRepository { findAll(): Promise<FixtureListItem[]>; getProvenance(): Promise<DataProvenance>; }
const snapshot = snapshotJson as RealDataSnapshot;

class SnapshotFixtureRepository implements FixtureRepository {
  async findAll() { return [...snapshot.fixtures].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)); }
  async getProvenance() { return snapshot.metadata ? { mode: "REAL" as const, provider: snapshot.metadata.provider, importedAt: snapshot.metadata.importedAt, season: snapshot.metadata.season, note: "Calendario obtenido del proveedor configurado." } : { mode: "DEMO" as const, provider: "none", importedAt: null, season: "2026/27", note: "Todavía no se ha importado un calendario real." }; }
}

export const fixtureRepository: FixtureRepository = new SnapshotFixtureRepository();
