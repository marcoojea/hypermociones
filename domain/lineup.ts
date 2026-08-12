import type { Position } from "./player";

export const formationCodes = ["4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "5-3-2"] as const;
export type FormationCode = (typeof formationCodes)[number];

export interface FormationSlot {
  id: string;
  label: string;
  position: Position;
  x: number;
  y: number;
}

export interface LineupSelection {
  slotId: string;
  playerId: string | null;
  confidence: number;
}

export interface BenchSelection {
  playerId: string;
  confidence: number;
}

export interface StoredLineup {
  version: 1;
  teamId: string;
  round: number;
  formation: FormationCode;
  starters: LineupSelection[];
  substitutes: BenchSelection[];
  captainId: string | null;
  penaltyTakerId: string | null;
  freeKickTakerId: string | null;
  cornerTakerId: string | null;
  notes: string;
  updatedAt: string;
}

const row = (prefix: string, position: Position, y: number, count: number): FormationSlot[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    label: `${position} ${index + 1}`,
    position,
    x: ((index + 1) * 100) / (count + 1),
    y,
  }));

export const formations: Record<FormationCode, FormationSlot[]> = {
  "4-4-2": [
    ...row("por", "POR", 88, 1), ...row("def", "DEF", 69, 4),
    ...row("med", "MED", 43, 4), ...row("del", "DEL", 17, 2),
  ],
  "4-3-3": [
    ...row("por", "POR", 88, 1), ...row("def", "DEF", 69, 4),
    ...row("med", "MED", 43, 3), ...row("del", "DEL", 17, 3),
  ],
  "4-2-3-1": [
    ...row("por", "POR", 88, 1), ...row("def", "DEF", 69, 4),
    ...row("piv", "MED", 52, 2), ...row("mp", "MED", 34, 3), ...row("del", "DEL", 14, 1),
  ],
  "3-5-2": [
    ...row("por", "POR", 88, 1), ...row("def", "DEF", 68, 3),
    ...row("med", "MED", 42, 5), ...row("del", "DEL", 16, 2),
  ],
  "5-3-2": [
    ...row("por", "POR", 88, 1), ...row("def", "DEF", 68, 5),
    ...row("med", "MED", 42, 3), ...row("del", "DEL", 16, 2),
  ],
};

export const lineupStorageKey = (teamId: string, round: number) => `hypermociones:lineup:v1:${teamId}:${round}`;

export function emptyLineup(teamId: string, round: number, formation: FormationCode = "4-2-3-1"): StoredLineup {
  return {
    version: 1,
    teamId,
    round,
    formation,
    starters: formations[formation].map((slot) => ({ slotId: slot.id, playerId: null, confidence: 60 })),
    substitutes: [],
    captainId: null,
    penaltyTakerId: null,
    freeKickTakerId: null,
    cornerTakerId: null,
    notes: "",
    updatedAt: new Date(0).toISOString(),
  };
}

export function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

export function isStoredLineup(value: unknown, expectedTeamId?: string, expectedRound?: number): value is StoredLineup {
  if (!value || typeof value !== "object") return false;
  const lineup = value as Partial<StoredLineup>;
  if (lineup.version !== 1 || typeof lineup.teamId !== "string" || (expectedTeamId !== undefined && lineup.teamId !== expectedTeamId)
    || !Number.isInteger(lineup.round) || (expectedRound !== undefined && lineup.round !== expectedRound)
    || !formationCodes.includes(lineup.formation as FormationCode) || !Array.isArray(lineup.starters) || !Array.isArray(lineup.substitutes)
    || typeof lineup.notes !== "string" || typeof lineup.updatedAt !== "string") return false;
  const validSlots = new Set(formations[lineup.formation as FormationCode].map((slot) => slot.id));
  const selectedSlots = new Set<string>();
  const validSelection = lineup.starters.length === validSlots.size && lineup.starters.every((selection) => {
    if (!selection || typeof selection.slotId !== "string" || !validSlots.has(selection.slotId) || selectedSlots.has(selection.slotId)
      || !(selection.playerId === null || typeof selection.playerId === "string") || typeof selection.confidence !== "number" || !Number.isFinite(selection.confidence) || selection.confidence < 0 || selection.confidence > 100) return false;
    selectedSlots.add(selection.slotId); return true;
  });
  const validBench = lineup.substitutes.every((selection) => selection && typeof selection.playerId === "string" && typeof selection.confidence === "number" && Number.isFinite(selection.confidence) && selection.confidence >= 0 && selection.confidence <= 100);
  const validRole = (role: unknown) => role === null || typeof role === "string";
  return validSelection && validBench && validRole(lineup.captainId) && validRole(lineup.penaltyTakerId) && validRole(lineup.freeKickTakerId) && validRole(lineup.cornerTakerId);
}
