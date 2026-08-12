import { formationCodes, formations, type FormationCode, type StoredLineup } from "./lineup";
import type { PlayerListItem, PlayerStatus } from "./player";

export interface FantasyRulesConfig {
  squadSize: number;
  lineupSize: 11;
  benchSize: number;
  maxPlayersPerClub: number;
  captainEnabled: boolean;
  allowedFormations: FormationCode[];
}

export interface FantasySquadEntry {
  playerId: string;
  purchasePrice: number | null;
  projectedPoints: number | null;
  startingChance: number;
}

export interface MyFantasyTeam {
  version: 1;
  name: string;
  round: number;
  formation: FormationCode;
  budget: number | null;
  rules: FantasyRulesConfig;
  squad: FantasySquadEntry[];
  updatedAt: string;
}

export interface PlayerDecisionScore {
  playerId: string;
  score: number;
  projectedPoints: number | null;
  dataSignals: number;
  status: PlayerStatus;
  reasons: string[];
  risks: string[];
}

export interface OptimizedFantasyLineup {
  formation: FormationCode;
  lineup: StoredLineup;
  starters: PlayerDecisionScore[];
  bench: PlayerDecisionScore[];
  captainId: string | null;
  totalProjectedPoints: number | null;
  warnings: string[];
}

export const defaultFantasyRules: FantasyRulesConfig = {
  squadSize: 25,
  lineupSize: 11,
  benchSize: 4,
  maxPlayersPerClub: 4,
  captainEnabled: true,
  allowedFormations: [...formationCodes],
};

export const myTeamStorageKey = "hypermociones:my-team:v1";

export function emptyFantasyTeam(round = 1): MyFantasyTeam {
  return { version: 1, name: "Mi equipo", round, formation: "4-3-3", budget: null, rules: { ...defaultFantasyRules, allowedFormations: [...defaultFantasyRules.allowedFormations] }, squad: [], updatedAt: new Date(0).toISOString() };
}

const finiteOrNull = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function isMyFantasyTeam(value: unknown): value is MyFantasyTeam {
  if (!value || typeof value !== "object") return false;
  const team = value as Partial<MyFantasyTeam>;
  return team.version === 1 && typeof team.name === "string" && typeof team.round === "number"
    && formationCodes.includes(team.formation as FormationCode) && Array.isArray(team.squad)
    && Boolean(team.rules) && Array.isArray(team.rules?.allowedFormations)
    && team.squad.every((entry) => typeof entry?.playerId === "string" && typeof entry?.startingChance === "number");
}

export function scoreFantasyPlayer(player: PlayerListItem, entry: FantasySquadEntry, status: PlayerStatus): PlayerDecisionScore {
  const signals: Array<{ value: number | null; label: string }> = [
    { value: finiteOrNull(entry.projectedPoints), label: "Proyección manual" },
    { value: finiteOrNull(player.pointsPerGame), label: "Puntos por partido" },
    { value: finiteOrNull(player.form), label: "Forma reciente" },
    { value: player.fis === null ? null : player.fis / 10, label: "FIS" },
    { value: player.xgi === null ? null : clamp(player.xgi * 5, 0, 10), label: "xGI" },
  ];
  const available = signals.filter((signal): signal is { value: number; label: string } => signal.value !== null);
  const explicitProjection = entry.projectedPoints !== null;
  const base = explicitProjection ? clamp(entry.projectedPoints ?? 0, 0, 30) : available.length ? available.reduce((sum, signal) => sum + clamp(signal.value, 0, 10), 0) / available.length : 0;
  const statusMultiplier: Record<PlayerStatus, number> = { AVAILABLE: 1, UNKNOWN: 0.72, DOUBTFUL: 0.48, INJURED: 0, SUSPENDED: 0 };
  const score = base * statusMultiplier[status] * (clamp(entry.startingChance, 0, 100) / 100);
  const reasons = available.slice(0, 3).map((signal) => `${signal.label}: ${signal.value.toFixed(1)}`);
  if (entry.startingChance >= 75) reasons.push(`Titularidad manual alta: ${entry.startingChance}%`);
  const risks: string[] = [];
  if (status === "UNKNOWN") risks.push("Disponibilidad sin confirmar");
  if (status === "DOUBTFUL") risks.push("Marcado como duda");
  if (status === "INJURED") risks.push("Lesionado: excluido del once");
  if (status === "SUSPENDED") risks.push("Sancionado: excluido del once");
  if (!available.length) risks.push("Sin métricas ni proyección manual; puntuación neutra");
  if (entry.startingChance < 50) risks.push(`Titularidad manual baja: ${entry.startingChance}%`);
  return { playerId: player.id, score: Number(score.toFixed(3)), projectedPoints: explicitProjection ? entry.projectedPoints : null, dataSignals: available.length, status, reasons, risks };
}

export function optimizeFantasyLineup(args: {
  team: MyFantasyTeam;
  players: PlayerListItem[];
  statuses?: ReadonlyMap<string, PlayerStatus>;
}): OptimizedFantasyLineup {
  const { team, players, statuses = new Map() } = args;
  const formation = team.rules.allowedFormations.includes(team.formation) ? team.formation : team.rules.allowedFormations[0] ?? "4-3-3";
  const playerById = new Map(players.map((player) => [player.id, player]));
  const scored = team.squad.flatMap((entry) => {
    const player = playerById.get(entry.playerId);
    return player ? [{ player, entry, decision: scoreFantasyPlayer(player, entry, statuses.get(player.id) ?? player.status) }] : [];
  });
  const selected = new Set<string>();
  const clubCounts = new Map<string, number>();
  const starters: PlayerDecisionScore[] = [];
  const lineupSelections = formations[formation].map((slot) => {
    const candidate = scored
      .filter(({ player, decision }) => player.position === slot.position && !selected.has(player.id) && decision.status !== "INJURED" && decision.status !== "SUSPENDED" && (clubCounts.get(player.team.id) ?? 0) < team.rules.maxPlayersPerClub)
      .sort((a, b) => b.decision.score - a.decision.score || b.entry.startingChance - a.entry.startingChance || a.player.name.localeCompare(b.player.name, "es"))[0];
    if (!candidate) return { slotId: slot.id, playerId: null, confidence: 0 };
    selected.add(candidate.player.id);
    clubCounts.set(candidate.player.team.id, (clubCounts.get(candidate.player.team.id) ?? 0) + 1);
    starters.push(candidate.decision);
    return { slotId: slot.id, playerId: candidate.player.id, confidence: Math.round(clamp(candidate.entry.startingChance, 0, 100)) };
  });
  const bench = scored.filter(({ player, decision }) => !selected.has(player.id) && decision.status !== "INJURED" && decision.status !== "SUSPENDED")
    .sort((a, b) => b.decision.score - a.decision.score || a.player.name.localeCompare(b.player.name, "es"))
    .slice(0, team.rules.benchSize).map(({ decision }) => decision);
  const captainId = team.rules.captainEnabled ? [...starters].sort((a, b) => b.score - a.score)[0]?.playerId ?? null : null;
  const projectionValues = starters.map((decision) => decision.projectedPoints);
  const completeProjection = starters.length === 11 && projectionValues.every((value) => value !== null);
  const warnings: string[] = [];
  if (starters.length < 11) warnings.push(`Faltan ${11 - starters.length} titulares compatibles con ${formation}.`);
  if (!completeProjection) warnings.push("Los puntos esperados solo se totalizan cuando los 11 titulares tienen proyección manual.");
  if (starters.some((decision) => decision.status === "DOUBTFUL")) warnings.push("El once contiene jugadores marcados como duda.");
  if (starters.some((decision) => decision.dataSignals === 0)) warnings.push("Hay selecciones sin señales estadísticas; revisa las proyecciones manuales.");
  const lineup: StoredLineup = {
    version: 1, teamId: "my-team", round: team.round, formation, starters: lineupSelections,
    substitutes: bench.map((decision) => ({ playerId: decision.playerId, confidence: Math.round(scored.find(({ player }) => player.id === decision.playerId)?.entry.startingChance ?? 0) })),
    captainId, penaltyTakerId: null, freeKickTakerId: null, cornerTakerId: null,
    notes: "Generada por el optimizador explicable de Mi equipo.", updatedAt: new Date().toISOString(),
  };
  return { formation, lineup, starters, bench, captainId, totalProjectedPoints: completeProjection ? projectionValues.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null, warnings };
}
