import { playerStatuses, type PlayerListItem, type PlayerStatus } from "./player";

export const availabilityConfidenceLevels = ["CONFIRMED", "REPORTED", "EDITORIAL"] as const;
export type AvailabilityConfidence = (typeof availabilityConfidenceLevels)[number];

export interface AvailabilityRecord {
  version: 1;
  playerId: string;
  teamId: string;
  round: number;
  status: PlayerStatus;
  reason: string;
  expectedReturn: string;
  sourceLabel: string;
  sourceUrl: string;
  confidence: AvailabilityConfidence;
  updatedAt: string;
}

export const availabilityStorageKey = (round: number) => `hypermociones:availability:v1:${round}`;

export function emptyAvailabilityRecord(player: PlayerListItem, round: number): AvailabilityRecord {
  return {
    version: 1,
    playerId: player.id,
    teamId: player.team.id,
    round,
    status: player.status,
    reason: "",
    expectedReturn: "",
    sourceLabel: "",
    sourceUrl: "",
    confidence: "EDITORIAL",
    updatedAt: new Date(0).toISOString(),
  };
}

export function isAvailabilityRecord(value: unknown, round?: number): value is AvailabilityRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AvailabilityRecord>;
  return record.version === 1
    && typeof record.playerId === "string"
    && typeof record.teamId === "string"
    && typeof record.round === "number"
    && (round === undefined || record.round === round)
    && playerStatuses.includes(record.status as PlayerStatus)
    && availabilityConfidenceLevels.includes(record.confidence as AvailabilityConfidence)
    && typeof record.reason === "string"
    && typeof record.expectedReturn === "string"
    && typeof record.sourceLabel === "string"
    && typeof record.sourceUrl === "string"
    && typeof record.updatedAt === "string";
}

export function parseAvailabilityRecords(raw: string | null, round: number): AvailabilityRecord[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((record) => isAvailabilityRecord(record, round));
  } catch {
    return [];
  }
}

export function effectivePlayerStatus(player: PlayerListItem, records: ReadonlyMap<string, AvailabilityRecord>) {
  return records.get(player.id)?.status ?? player.status;
}

export function isHardUnavailable(status: PlayerStatus) {
  return status === "INJURED" || status === "SUSPENDED";
}
