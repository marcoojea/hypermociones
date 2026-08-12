import type { PlayerListItem, PlayerStatus, Position } from "./player";

export const playerTiers = ["S+", "S", "A", "B", "C", "NR"] as const;
export type PlayerTier = (typeof playerTiers)[number];
export type RecommendationSource = "MIXED" | "EDITORIAL" | "MODEL" | "UNRATED";

export interface PlayerRecommendation {
  playerId: string;
  position: Position;
  startingProbability: number | null;
  recommendationScore: number | null;
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
  if (editorial !== null) startSignals.push({ value: clamp(editorial), weight: 5, label: `Confianza editorial: ${Math.round(clamp(editorial))}%` });
  if (finite(player.starts) !== null && finite(player.appearances) !== null && (player.appearances ?? 0) >= 3) startSignals.push({ value: clamp(((player.starts ?? 0) / (player.appearances ?? 1)) * 100), weight: 3, label: "Frecuencia de titularidad" });
  if (finite(player.minutes) !== null && finite(player.appearances) !== null && (player.appearances ?? 0) >= 3) startSignals.push({ value: clamp(((player.minutes ?? 0) / (player.appearances ?? 1) / 90) * 100), weight: 2, label: "Minutos por aparición" });
  if (player.recentMinutes.length >= 2) startSignals.push({ value: clamp((player.recentMinutes.reduce((sum, value) => sum + value, 0) / player.recentMinutes.length / 90) * 100), weight: 2, label: "Minutos recientes" });

  let startingProbability = startSignals.length ? startSignals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / startSignals.reduce((sum, signal) => sum + signal.weight, 0) : null;
  if (status === "INJURED" || status === "SUSPENDED") startingProbability = 0;
  else if (startingProbability !== null && status === "DOUBTFUL") startingProbability *= .55;
  startingProbability = startingProbability === null ? null : Math.round(clamp(startingProbability));
  reasons.push(...startSignals.slice(0, 3).map((signal) => signal.label));
  if (status === "INJURED") risks.push("Lesionado: no recomendable");
  if (status === "SUSPENDED") risks.push("Sancionado: no disponible");
  if (status === "DOUBTFUL") risks.push("Duda: probabilidad penalizada");
  if (status === "UNKNOWN") risks.push("Disponibilidad por confirmar");

  const performanceSignals = [
    finite(player.pointsPerGame) === null ? null : { value: clamp((player.pointsPerGame ?? 0) * 10), label: "Puntos por partido" },
    finite(player.form) === null ? null : { value: clamp((player.form ?? 0) * 10), label: "Forma reciente" },
    finite(player.fis) === null ? null : { value: clamp(player.fis ?? 0), label: "FIS" },
    finite(player.xgi) === null ? null : { value: clamp((player.xgi ?? 0) * 70), label: "Producción xGI" },
  ].filter((signal): signal is { value: number; label: string } => signal !== null);
  const fixture = finite(fixtureDifficulty);
  const scoreParts: Array<{ value: number; weight: number }> = [];
  if (startingProbability !== null) scoreParts.push({ value: startingProbability, weight: 7 });
  if (performanceSignals.length) scoreParts.push({ value: performanceSignals.reduce((sum, signal) => sum + signal.value, 0) / performanceSignals.length, weight: 2 });
  if (fixture !== null && fixture >= 1 && fixture <= 5) scoreParts.push({ value: (6 - fixture) * 20, weight: 1 });
  const recommendationScore = scoreParts.length ? Math.round(scoreParts.reduce((sum, part) => sum + part.value * part.weight, 0) / scoreParts.reduce((sum, part) => sum + part.weight, 0)) : null;
  if (performanceSignals.length) reasons.push(`Rendimiento: ${performanceSignals.map((signal) => signal.label).join(", ")}`);
  if (fixture !== null && fixture >= 1 && fixture <= 5) reasons.push(`Dificultad del rival: ${fixture}/5`);
  if (startingProbability === null) risks.push("Sin señales suficientes para estimar titularidad");
  if (!performanceSignals.length) risks.push("Sin métricas de rendimiento disponibles");
  const signalsUsed = startSignals.length + performanceSignals.length + (fixture !== null ? 1 : 0);
  const coverage = signalsUsed >= 6 ? "HIGH" : signalsUsed >= 3 ? "MEDIUM" : signalsUsed >= 1 ? "LOW" : "NONE";
  const source: RecommendationSource = editorial !== null && startSignals.length > 1 ? "MIXED" : editorial !== null ? "EDITORIAL" : startSignals.length ? "MODEL" : "UNRATED";
  return { playerId: player.id, position: player.position, startingProbability, recommendationScore, tier: tierFromScore(recommendationScore), source, coverage, signalsUsed, reasons, risks };
}

export function rankRecommendations(recommendations: readonly PlayerRecommendation[]) {
  return [...recommendations].sort((a, b) => (b.recommendationScore ?? -1) - (a.recommendationScore ?? -1) || (b.startingProbability ?? -1) - (a.startingProbability ?? -1) || a.playerId.localeCompare(b.playerId));
}
