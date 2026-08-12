import type { PlayerListItem } from "./player";

export type FreshnessLevel = "FRESH" | "REVIEW" | "STALE" | "UNKNOWN";

export interface DataFreshness {
  level: FreshnessLevel;
  ageDays: number | null;
  label: string;
}

export interface MetricCoverage {
  key: string;
  label: string;
  available: number;
  total: number;
  percentage: number;
}

export function getDataFreshness(importedAt: string | null, now = new Date()): DataFreshness {
  if (!importedAt) return { level: "UNKNOWN", ageDays: null, label: "Sin importación" };
  const imported = new Date(importedAt);
  if (Number.isNaN(imported.getTime())) return { level: "UNKNOWN", ageDays: null, label: "Fecha no válida" };
  const ageDays = Math.max(0, Math.floor((now.getTime() - imported.getTime()) / 86_400_000));
  if (ageDays <= 2) return { level: "FRESH", ageDays, label: ageDays === 0 ? "Actualizado hoy" : `Actualizado hace ${ageDays} día${ageDays === 1 ? "" : "s"}` };
  if (ageDays <= 7) return { level: "REVIEW", ageDays, label: `Revisar actualización · ${ageDays} días` };
  return { level: "STALE", ageDays, label: `Datos desactualizados · ${ageDays} días` };
}

export function buildMetricCoverage(players: readonly PlayerListItem[]): MetricCoverage[] {
  const metrics: Array<[string, string, (player: PlayerListItem) => boolean]> = [
    ["age", "Edad", (player) => player.age !== null],
    ["shirtNumber", "Dorsal", (player) => player.shirtNumber !== null],
    ["appearances", "Apariciones", (player) => player.appearances !== null],
    ["minutes", "Minutos", (player) => player.minutes !== null],
    ["goals", "Goles", (player) => player.goals !== null],
    ["assists", "Asistencias", (player) => player.assists !== null],
    ["cards", "Tarjetas", (player) => player.yellowCards != null || player.redCards != null],
    ["history", "Histórico 2025/26", (player) => player.previousSeason !== null && player.previousSeason !== undefined],
    ["impact", "Impacto por posición", (player) => player.previousSeason?.impactScore !== undefined],
    ["marketValue", "Valor de mercado", (player) => player.marketValue !== null && player.marketValue !== undefined],
    ["fis", "FIS", (player) => player.fis !== null],
  ];
  return metrics.map(([key, label, hasValue]) => {
    const available = players.filter(hasValue).length;
    return { key, label, available, total: players.length, percentage: players.length ? Math.round((available / players.length) * 100) : 0 };
  });
}
