import type { PlayerListItem, PlayerStatus, Position } from "./player";

export const playerTiers = ["S+", "S", "A", "B", "C", "NR"] as const;
export type PlayerTier = (typeof playerTiers)[number];
export type RecommendationSource = "MIXED" | "EDITORIAL" | "MODEL" | "UNRATED";

export interface PlayerRecommendation {
  playerId: string;
  position: Position;
  startingProbability: number | null;
  recommendationScore: number | null;
  impactScore: number | null;
  relevanceScore: number | null;
  marketValueEur: number | null;
  marketValueDate: string | null;
  historicalSeason: string | null;
  tier: PlayerTier;
  source: RecommendationSource;
  coverage: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  signalsUsed: number;
  reasons: string[];
  risks: string[];
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const finite = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null;

export function tierFromScore(score: number | null): PlayerTier {
  if (score === null) return "NR";
  if (score >= 85) return "S+";
  if (score >= 75) return "S";
  if (score >= 65) return "A";
  if (score >= 50) return "B";
  return "C";
}

export function recommendPlayer(args: {
  player: PlayerListItem;
  status?: PlayerStatus;
  editorialConfidence?: number | null;
  fixtureDifficulty?: number | null;
}): PlayerRecommendation {
  const { player, status = player.status, editorialConfidence = null, fixtureDifficulty = player.fixtureDifficulty } = args;
  const reasons: string[] = [];
  const risks: string[] = [];
  const startSignals: Array<{ value: number; weight: number; label: string }> = [];
  const editorial = finite(editorialConfidence);
  const history = player.previousSeason;
  if (editorial !== null) startSignals.push({ value: clamp(editorial), weight: 6, label: `Confianza editorial actual: ${Math.round(clamp(editorial))}%` });
  if (finite(player.starts) !== null && finite(player.appearances) !== null && (player.appearances ?? 0) >= 3) startSignals.push({ value: clamp(((player.starts ?? 0) / (player.appearances ?? 1)) * 100), weight: 5, label: "Titularidad de la temporada actual" });
  if (player.recentMinutes.length >= 2) startSignals.push({ value: clamp((player.recentMinutes.reduce((sum, value) => sum + value, 0) / player.recentMinutes.length / 90) * 100), weight: 4, label: "Minutos recientes" });
  if (history && history.appearances >= 3) {
    if (finite(history.starts) !== null) startSignals.push({ value: clamp(((history.starts ?? 0) / history.appearances) * history.appearanceRate), weight: 5, label: `Titularidades ${history.season}: ${history.starts}/${history.appearances}` });
    startSignals.push({ value: history.minuteShare, weight: 3, label: `Cuota de minutos ${history.season}: ${history.minuteShare}%` });
    startSignals.push({ value: history.appearanceRate, weight: 1, label: `Participación ${history.season}: ${history.appearanceRate}%` });
  }

  let startingProbability = startSignals.length ? startSignals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / startSignals.reduce((sum, signal) => sum + signal.weight, 0) : null;
  const hasCurrentParticipation = editorial !== null || (finite(player.starts) !== null && finite(player.appearances) !== null) || player.recentMinutes.length >= 2;
  if (startingProbability !== null && history && !hasCurrentParticipation) {
    const reliability = history.confidence === "HIGH" ? .85 : history.confidence === "MEDIUM" ? .65 : .4;
    startingProbability = 50 + (startingProbability - 50) * reliability;
  }
  if (status === "INJURED" || status === "SUSPENDED") startingProbability = 0;
  else if (startingProbability !== null && status === "DOUBTFUL") startingProbability *= .55;
  startingProbability = startingProbability === null ? null : Math.round(clamp(startingProbability));
  reasons.push(...startSignals.slice(0, 3).map((signal) => signal.label));
  if (history && !hasCurrentParticipation) reasons.push(`Estimación conservadora: histórico ${history.season} ajustado por tamaño de muestra`);
  if (status === "INJURED") risks.push("Lesionado: no recomendable");
  if (status === "SUSPENDED") risks.push("Sancionado: no disponible");
  if (status === "DOUBTFUL") risks.push("Duda: probabilidad penalizada");
  if (status === "UNKNOWN") risks.push("Disponibilidad 2026/27 por confirmar");

  const impactScore = finite(history?.impactScore);
  const relevanceScore = finite(history?.relevanceScore);
  const marketIsCurrentEnough = player.marketValue ? Date.now() - new Date(player.marketValue.valuedAt).getTime() <= 370 * 86_400_000 : false;
  const marketPercentile = marketIsCurrentEnough ? finite(player.marketValue?.positionPercentile) : null;
  const fixture = finite(fixtureDifficulty);
  const scoreParts: Array<{ value: number; weight: number }> = [];
  if (startingProbability !== null) scoreParts.push({ value: startingProbability, weight: 4.5 });
  if (impactScore !== null) scoreParts.push({ value: impactScore, weight: 2.5 });
  if (relevanceScore !== null) scoreParts.push({ value: relevanceScore, weight: 2 });
  if (marketPercentile !== null) scoreParts.push({ value: marketPercentile, weight: 1 });
  if (fixture !== null && fixture >= 1 && fixture <= 5) scoreParts.push({ value: (6 - fixture) * 20, weight: 1 });
  const recommendationScore = startingProbability === null || (impactScore === null && relevanceScore === null)
    ? null : Math.round(scoreParts.reduce((sum, part) => sum + part.value * part.weight, 0) / scoreParts.reduce((sum, part) => sum + part.weight, 0));
  if (history) reasons.push(`Impacto ${history.season}: ${history.impactScore}/100 · relevancia: ${history.relevanceScore}/100`);
  if (player.marketValue) reasons.push(`Valor de mercado: ${(player.marketValue.amountEur / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} M€ (${player.marketValue.valuedAt})`);
  if (fixture !== null && fixture >= 1 && fixture <= 5) reasons.push(`Dificultad del rival: ${fixture}/5`);
  if (startingProbability === null) risks.push("Sin señales suficientes para estimar participación");
  if (!history) risks.push("Sin rendimiento 2025/26 enlazado");
  if (!player.marketValue) risks.push("Sin valor de mercado enlazado");
  else if (Date.now() - new Date(player.marketValue.valuedAt).getTime() > 370 * 86_400_000) risks.push("Valor de mercado con más de un año: revisar antes de decidir");
  const signalsUsed = startSignals.length + Number(impactScore !== null) + Number(relevanceScore !== null) + Number(marketPercentile !== null) + Number(fixture !== null);
  const coverage = history?.confidence === "HIGH" && marketIsCurrentEnough ? "HIGH" : history ? "MEDIUM" : signalsUsed ? "LOW" : "NONE";
  const source: RecommendationSource = editorial !== null && history ? "MIXED" : editorial !== null ? "EDITORIAL" : history ? "MODEL" : "UNRATED";
  return { playerId: player.id, position: player.position, startingProbability, recommendationScore, impactScore, relevanceScore,
    marketValueEur: player.marketValue?.amountEur ?? null, marketValueDate: player.marketValue?.valuedAt ?? null, historicalSeason: history?.season ?? null,
    tier: tierFromScore(recommendationScore), source, coverage, signalsUsed, reasons, risks };
}

export function rankRecommendations(recommendations: readonly PlayerRecommendation[]) {
  return [...recommendations].sort((a, b) => (b.recommendationScore ?? -1) - (a.recommendationScore ?? -1) || (b.startingProbability ?? -1) - (a.startingProbability ?? -1) || a.playerId.localeCompare(b.playerId));
}
