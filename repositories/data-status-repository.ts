import snapshotJson from "@/data/generated/real-data.json";
import type { RealDataSnapshot } from "@/data/real-data-types";
import { buildMetricCoverage, getDataFreshness } from "@/domain/data-quality";

const snapshot = snapshotJson as RealDataSnapshot;

export function getDataStatus(now = new Date()) {
  const metadata = snapshot.metadata;
  return {
    mode: metadata ? "REAL" as const : "DEMO" as const,
    provider: metadata?.provider ?? "Sin proveedor",
    season: metadata?.season ?? "2026/27",
    importedAt: metadata?.importedAt ?? null,
    freshness: getDataFreshness(metadata?.importedAt ?? null, now),
    teams: snapshot.teams.length,
    players: snapshot.players.length,
    fixtures: snapshot.fixtures.length,
    coverage: buildMetricCoverage(snapshot.players),
    unavailableMetrics: [...(metadata?.unavailableMetrics ?? [])],
  };
}
