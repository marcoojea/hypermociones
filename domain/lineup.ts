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
