import { z } from "zod";
import { normalizeTeamName } from "./segunda-matches";

// Unofficial ESPN feed (no key). Shapes are validated; anything unexpected throws or is reported.
export type LineupStatus = "STARTER" | "BENCH" | "NOT_LISTED";

export interface EspnSideScore { name: string; score: number | null }

export interface EspnScoreboardMatch {
  espnId: string;
  kickoffAt: string | null;
  state: "pre" | "in" | "post" | null;
  completed: boolean;
  clock: string | null;
  detail: string | null;
  home: EspnSideScore;
  away: EspnSideScore;
}

export interface EspnSideLineup { teamName: string; starters: string[]; bench: string[] }

export interface EspnEvent { minute: string | null; type: string; text: string; teamName: string | null; scoring: boolean }

export interface EspnSummary {
  lineups: { home: EspnSideLineup | null; away: EspnSideLineup | null };
  events: EspnEvent[];
}

const teamSchema = z.object({ displayName: z.string(), id: z.string().nullish() });

const scoreboardEventSchema = z.object({
  id: z.string(),
  date: z.string().nullish(),
  status: z.object({
    displayClock: z.string().nullish(),
    type: z.object({ state: z.string().nullish(), completed: z.boolean().nullish(), detail: z.string().nullish() }).nullish(),
  }).nullish(),
  competitions: z.array(z.object({
    competitors: z.array(z.object({ homeAway: z.enum(["home", "away"]), score: z.union([z.string(), z.number()]).nullish(), team: teamSchema })),
  })).default([]),
});

const scoreboardSchema = z.object({ events: z.array(scoreboardEventSchema).default([]) });

const summarySchema = z.object({
  rosters: z.array(z.object({
    homeAway: z.enum(["home", "away"]),
    team: teamSchema,
    roster: z.array(z.object({ starter: z.boolean().nullish(), athlete: z.object({ displayName: z.string() }) })).default([]),
  })).default([]),
  keyEvents: z.array(z.object({
    type: z.object({ text: z.string().nullish() }).nullish(),
    text: z.string().nullish(),
    scoringPlay: z.boolean().nullish(),
    clock: z.object({ displayValue: z.string().nullish() }).nullish(),
    team: teamSchema.nullish(),
  })).default([]),
});

const STATES = new Set(["pre", "in", "post"]);

const toScore = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0) throw new Error(`marcador no válido: "${value}"`);
  return score;
};

function toScoreboardMatch(event: z.infer<typeof scoreboardEventSchema>): EspnScoreboardMatch {
  const competitors = event.competitions[0]?.competitors ?? [];
  const side = (homeAway: "home" | "away"): EspnSideScore => {
    const competitor = competitors.find((item) => item.homeAway === homeAway);
    if (!competitor) throw new Error(`evento ${event.id}: falta el equipo ${homeAway}`);
    return { name: competitor.team.displayName, score: toScore(competitor.score) };
  };
  const state = event.status?.type?.state ?? null;
  return {
    espnId: event.id,
    kickoffAt: event.date ?? null,
    state: state && STATES.has(state) ? (state as "pre" | "in" | "post") : null,
    completed: event.status?.type?.completed ?? false,
    clock: event.status?.displayClock ?? null,
    detail: event.status?.type?.detail ?? null,
    home: side("home"),
    away: side("away"),
  };
}

// Strict: any malformed event throws. Use splitScoreboard to keep the good ones.
export function parseScoreboard(json: unknown): EspnScoreboardMatch[] {
  return scoreboardSchema.parse(json).events.map(toScoreboardMatch);
}

// Tolerant: a malformed event is reported and the rest still count.
export function splitScoreboard(json: unknown): { matches: EspnScoreboardMatch[]; errors: string[] } {
  const raw = z.object({ events: z.array(z.unknown()).default([]) }).parse(json);
  const matches: EspnScoreboardMatch[] = [];
  const errors: string[] = [];
  raw.events.forEach((item, index) => {
    try {
      matches.push(toScoreboardMatch(scoreboardEventSchema.parse(item)));
    } catch (error) {
      errors.push(`evento ${index}: ${error instanceof Error ? error.message : "no válido"}`);
    }
  });
  return { matches, errors };
}

// A side counts as published only with exactly 11 starters; fewer means the XI is not out yet.
const publishedSide = (side: z.infer<typeof summarySchema>["rosters"][number]): EspnSideLineup | null => {
  const starters = side.roster.filter((entry) => entry.starter === true).map((entry) => entry.athlete.displayName);
  if (starters.length !== 11) return null;
  const bench = side.roster.filter((entry) => entry.starter !== true).map((entry) => entry.athlete.displayName);
  return { teamName: side.team.displayName, starters, bench };
};

export function parseSummary(json: unknown): EspnSummary {
  const parsed = summarySchema.parse(json);
  const lineups = { home: null as EspnSideLineup | null, away: null as EspnSideLineup | null };
  for (const side of parsed.rosters) lineups[side.homeAway] = publishedSide(side);
  const events = parsed.keyEvents.map((event) => ({
    minute: event.clock?.displayValue ?? null,
    type: event.type?.text ?? "Evento",
    text: event.text ?? "",
    teamName: event.team?.displayName ?? null,
    scoring: event.scoringPlay === true,
  }));
  return { lineups, events };
}

// Player names differ between sources ("K. de Rooij" vs "Kaj de Rooij"), so accents and case are ignored.
export function normalizePlayerName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).join(" ");
}

// Loose match used only when no exact name exists; the caller still requires a single candidate.
export function samePlayer(ourName: string, espnName: string): boolean {
  const ours = normalizePlayerName(ourName);
  const theirs = normalizePlayerName(espnName);
  if (!ours || !theirs) return false;
  if (ours === theirs) return true;
  const oursTokens = ours.split(" ");
  const theirsTokens = theirs.split(" ");
  return oursTokens.at(-1) === theirsTokens.at(-1) && oursTokens[0]?.[0] === theirsTokens[0]?.[0];
}

export interface ResolvedLineup {
  // One status per squad player, same order as ourNames. Null for every player when the side cannot be trusted.
  statuses: (LineupStatus | null)[];
  unresolved: string[];
}

// Each ESPN name must resolve to exactly one squad player. Any unresolved name makes the whole side unusable.
export function resolveLineupStatuses(ourNames: string[], lineup: EspnSideLineup | null): ResolvedLineup {
  const statuses: (LineupStatus | null)[] = ourNames.map(() => null);
  if (!lineup) return { statuses, unresolved: [] };
  const unresolved: string[] = [];
  const assign = (espnNames: string[], status: LineupStatus) => {
    for (const espnName of espnNames) {
      const key = normalizePlayerName(espnName);
      const exact = ourNames.flatMap((name, index) => (key && normalizePlayerName(name) === key ? [index] : []));
      const candidates = exact.length > 0 ? exact : ourNames.flatMap((name, index) => (samePlayer(name, espnName) ? [index] : []));
      if (candidates.length !== 1 || statuses[candidates[0]] !== null) {
        unresolved.push(espnName);
        continue;
      }
      statuses[candidates[0]] = status;
    }
  };
  assign(lineup.starters, "STARTER");
  assign(lineup.bench, "BENCH");
  if (unresolved.length > 0) return { statuses: ourNames.map(() => null), unresolved };
  return { statuses: statuses.map((status) => status ?? "NOT_LISTED"), unresolved };
}

// The lineup overrides history only when the XI is published and every name resolved.
export function probabilityFromLineup(status: LineupStatus): number {
  return status === "STARTER" ? 100 : 0;
}

export function sameTeam(a: string, b: string): boolean {
  return normalizeTeamName(a) === normalizeTeamName(b) && normalizeTeamName(a) !== "";
}
