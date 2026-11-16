import { z } from "zod";
import type { FixtureListItem, FixtureStatus } from "./fixture";
import type { TeamSummary } from "./player";

export type SegundaMatchStatus = "SCHEDULED" | "FINISHED" | "POSTPONED" | "OTHER";

export interface SegundaMatch {
  eventId: string;
  round: number;
  date: string | null;
  time: string | null;
  kickoffAt: string | null;
  status: SegundaMatchStatus;
  rawStatus: string | null;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

const eventSchema = z.object({
  idEvent: z.string(),
  intRound: z.string().nullable(),
  dateEvent: z.string().nullable(),
  strTime: z.string().nullable(),
  strTimestamp: z.string().nullish(),
  strStatus: z.string().nullable(),
  strHomeTeam: z.string(),
  strAwayTeam: z.string(),
  intHomeScore: z.string().nullable(),
  intAwayScore: z.string().nullable(),
});

const eventsResponseSchema = z.object({ events: z.array(eventSchema).nullable() });

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AOT", "Match Finished"]);
const POSTPONED_STATUSES = new Set(["PST", "CANC", "ABD", "SUSP", "Postponed", "Cancelled", "Suspended"]);
const SCHEDULED_STATUSES = new Set(["NS", "Not Started"]);

export function toMatchStatus(raw: string | null): SegundaMatchStatus {
  if (raw === null) return "SCHEDULED";
  if (FINISHED_STATUSES.has(raw)) return "FINISHED";
  if (POSTPONED_STATUSES.has(raw)) return "POSTPONED";
  if (SCHEDULED_STATUSES.has(raw)) return "SCHEDULED";
  return "OTHER";
}

const INTEGER = /^\d+$/;
const LOCAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}:\d{2}$/;

// A score that is present but not a whole number is corrupt data, not a missing score.
const toGoals = (value: string | null, eventId: string) => {
  if (value === null || value.trim() === "") return null;
  if (!INTEGER.test(value.trim())) throw new Error(`marcador no válido en evento ${eventId}: "${value}"`);
  return Number(value);
};

const toKickoff = (timestamp: string | null | undefined, date: string | null, time: string | null) => {
  // TheSportsDB timestamps are UTC without an offset; the marker makes that explicit.
  if (timestamp && LOCAL_TIMESTAMP.test(timestamp)) return `${timestamp}Z`;
  return date && time && DATE.test(date) && TIME.test(time) ? `${date}T${time}Z` : null;
};

// Throws on an unexpected shape so the caller stops instead of guessing.
export function parseEventsResponse(json: unknown): SegundaMatch[] {
  const parsed = eventsResponseSchema.parse(json);
  return (parsed.events ?? []).map((event) => {
    const homeGoals = toGoals(event.intHomeScore, event.idEvent);
    const awayGoals = toGoals(event.intAwayScore, event.idEvent);
    const roundText = event.intRound?.trim() ?? "";
    if (!INTEGER.test(roundText) || Number(roundText) < 1) throw new Error(`jornada no válida en evento ${event.idEvent}: "${event.intRound}"`);
    const hasScores = homeGoals !== null && awayGoals !== null;
    let status = toMatchStatus(event.strStatus);
    // A missing status with scores is not a scheduled match.
    if (status === "SCHEDULED" && event.strStatus === null && hasScores) status = "OTHER";
    // A finished status without both scores is not a result.
    if (status === "FINISHED" && !hasScores) status = "OTHER";
    return {
      eventId: event.idEvent,
      round: Number(roundText),
      date: event.dateEvent,
      time: event.strTime,
      kickoffAt: toKickoff(event.strTimestamp, event.dateEvent, event.strTime),
      status,
      rawStatus: event.strStatus,
      home: event.strHomeTeam,
      away: event.strAwayTeam,
      homeGoals,
      awayGoals,
    };
  });
}

// A round that returns fewer matches (throttled or unpublished) must not look complete.
export function assertCompleteRound(matches: SegundaMatch[], round: number, expected: number) {
  if (matches.length !== expected) throw new Error(`jornada ${round}: ${matches.length} partidos, se esperaban ${expected}`);
  for (const match of matches) {
    if (match.round !== round) throw new Error(`jornada ${round}: el evento ${match.eventId} viene marcado como jornada ${match.round}`);
  }
}

export function assertNoDuplicateEvents(matches: SegundaMatch[]) {
  const seen = new Set<string>();
  for (const match of matches) {
    if (seen.has(match.eventId)) throw new Error(`evento duplicado: ${match.eventId}`);
    seen.add(match.eventId);
  }
}

const GENERIC_TOKENS = new Set(["cd", "ud", "rc", "rcd", "sd", "ad", "ce", "cf", "fc", "club", "de", "futbol", "balompie", "real"]);

// Club prefixes and suffixes differ between sources ("CD Leganés" vs "Leganés").
export function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !GENERIC_TOKENS.has(token))
    .join(" ");
}

const STATUS_MAP: Record<SegundaMatchStatus, FixtureStatus> = {
  SCHEDULED: "SCHEDULED",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
  OTHER: "TIMED",
};

// Returns the names it could not map so the caller can stop instead of writing a partial calendar.
export function toSnapshotFixtures(matches: SegundaMatch[], teams: TeamSummary[]) {
  const byName = new Map<string, TeamSummary | null>();
  for (const teamSummary of teams) {
    const key = normalizeTeamName(teamSummary.name);
    if (!key) continue;
    byName.set(key, byName.has(key) ? null : teamSummary);
  }
  const lookup = (name: string) => {
    const key = normalizeTeamName(name);
    return key ? (byName.get(key) ?? null) : null;
  };

  const unmatched: string[] = [];
  const fixtures: FixtureListItem[] = [];
  for (const match of matches) {
    const homeTeam = lookup(match.home);
    const awayTeam = lookup(match.away);
    if (!homeTeam) unmatched.push(match.home);
    if (!awayTeam) unmatched.push(match.away);
    // Without a date the fixture cannot be placed in the calendar.
    if (!match.kickoffAt && !match.date) unmatched.push(`${match.home} vs ${match.away} (sin fecha)`);
    if (!homeTeam || !awayTeam || (!match.kickoffAt && !match.date)) continue;
    fixtures.push({
      id: `ts-fixture-${match.eventId}`,
      externalId: `thesportsdb-${match.eventId}`,
      round: match.round,
      // shortcut: a date without hour uses 12:00Z and SCHEDULED, which the fixtures page labels "Hora pendiente"; upgrade when the feed always carries times.
      kickoffAt: match.kickoffAt ?? `${match.date}T12:00:00Z`,
      status: STATUS_MAP[match.status],
      homeTeam,
      awayTeam,
      homeScore: match.homeGoals,
      awayScore: match.awayGoals,
    });
  }
  return { fixtures, unmatched: [...new Set(unmatched)] };
}

// The weekend round is the first one where most fixtures are still scheduled; a single pending match does not make it active.
export function activeRoundNumber(fixtures: { status: string; round: number | null }[]): number | null {
  const byRound = new Map<number, { scheduled: number; total: number }>();
  for (const fixture of fixtures) {
    if (fixture.round === null) continue;
    const entry = byRound.get(fixture.round) ?? { scheduled: 0, total: 0 };
    entry.total += 1;
    if (fixture.status === "SCHEDULED") entry.scheduled += 1;
    byRound.set(fixture.round, entry);
  }
  const active = [...byRound.entries()].sort((a, b) => a[0] - b[0]).find(([, entry]) => entry.scheduled * 2 > entry.total);
  return active?.[0] ?? null;
}

// Earliest scheduled fixture decides the next round; postponed games from earlier rounds stay outstanding.
export function nextRoundNumber(fixtures: { status: string; kickoffAt: string; round: number | null }[]): number | null {
  const next = fixtures
    .filter((fixture) => fixture.status === "SCHEDULED" && fixture.round !== null)
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))[0];
  return next?.round ?? null;
}
