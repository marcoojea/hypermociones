import { isStoredLineup, type StoredLineup } from "./lineup";

export const lineupHistoryStorageKey = (teamId: string, round: number) => `hypermociones:lineup-history:v1:${teamId}:${round}`;
export interface LineupHistory { version: 1; teamId: string; round: number; revisions: StoredLineup[]; }
export function parseLineupHistory(raw: string | null, teamId: string, round: number): LineupHistory {
  if (!raw) return { version: 1, teamId, round, revisions: [] };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { version: 1, teamId, round, revisions: [] };
    const history = value as Partial<LineupHistory>;
    if (history.version !== 1 || history.teamId !== teamId || history.round !== round || !Array.isArray(history.revisions)) return { version: 1, teamId, round, revisions: [] };
    return { version: 1, teamId, round, revisions: history.revisions.filter((lineup) => isStoredLineup(lineup, teamId, round)).slice(-20) };
  } catch { return { version: 1, teamId, round, revisions: [] }; }
}
export function appendLineupRevision(history: LineupHistory, lineup: StoredLineup): LineupHistory {
  if (!isStoredLineup(lineup, history.teamId, history.round)) return history;
  return { ...history, revisions: [...history.revisions, lineup].slice(-20) };
}
export function lineupChanges(previous: StoredLineup | undefined, current: StoredLineup) {
  if (!previous) return [];
  const before = new Map(previous.starters.filter((item) => item.playerId).map((item) => [item.playerId as string, item.confidence]));
  const after = new Map(current.starters.filter((item) => item.playerId).map((item) => [item.playerId as string, item.confidence]));
  const changes: Array<{ playerId: string; type: "IN" | "OUT" | "UP" | "DOWN"; from: number | null; to: number | null }> = [];
  for (const [id, confidence] of after) { const old = before.get(id); if (old === undefined) changes.push({ playerId: id, type: "IN", from: null, to: confidence }); else if (confidence - old >= 10) changes.push({ playerId: id, type: "UP", from: old, to: confidence }); else if (old - confidence >= 10) changes.push({ playerId: id, type: "DOWN", from: old, to: confidence }); }
  for (const [id, confidence] of before) if (!after.has(id)) changes.push({ playerId: id, type: "OUT", from: confidence, to: null });
  return changes;
}
