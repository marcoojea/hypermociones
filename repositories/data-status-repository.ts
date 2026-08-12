import snapshotJson from "@/data/generated/real-data.json";
import intelligenceJson from "@/data/generated/player-intelligence.json";
import rfefHistoryJson from "@/data/generated/rfef-history.json";
import type { RealDataSnapshot } from "@/data/real-data-types";
import type { PlayerIntelligenceSnapshot } from "@/data/player-intelligence-types";
import type { RfefHistorySnapshot } from "@/data/rfef-history-types";
import { buildMetricCoverage, getDataFreshness } from "@/domain/data-quality";
import { enrichPlayersWithIntelligence } from "@/domain/player-intelligence";

const snapshot = snapshotJson as RealDataSnapshot;
const intelligence = intelligenceJson as PlayerIntelligenceSnapshot;
const rfefHistory = rfefHistoryJson as RfefHistorySnapshot;
const enrichedPlayers = enrichPlayersWithIntelligence(snapshot.players, intelligence, rfefHistory);

export function getDataStatus(now = new Date()) {
  const metadata = snapshot.metadata;
  const marketCutoff = now.getTime() - 370 * 86_400_000;
  return {
    mode: metadata ? "REAL" as const : "DEMO" as const,
    provider: metadata?.provider ?? "Sin proveedor",
    season: metadata?.season ?? "2026/27",
    importedAt: metadata?.importedAt ?? null,
    freshness: getDataFreshness(metadata?.importedAt ?? null, now),
    teams: snapshot.teams.length,
    players: snapshot.players.length,
    fixtures: snapshot.fixtures.length,
    coverage: buildMetricCoverage(enrichedPlayers),
    intelligence: { performanceSeason: rfefHistory.metadata?.season ?? intelligence.metadata?.performanceSeason ?? null, historicalPlayers: enrichedPlayers.filter((player) => player.previousSeason).length, marketValues: enrichedPlayers.filter((player) => player.marketValue).length, currentMarketValues: enrichedPlayers.filter((player) => player.marketValue && new Date(player.marketValue.valuedAt).getTime() >= marketCutoff).length, generatedAt: rfefHistory.metadata?.importedAt ?? intelligence.metadata?.generatedAt ?? null },
    unavailableMetrics: [...(metadata?.unavailableMetrics ?? [])],
  };
}
