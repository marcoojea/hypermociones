import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { RealDataSnapshot } from "../data/real-data-types";
import type {
  SyncEvent,
  SyncInjury,
  SyncMatch,
  SyncMetadata,
  SyncNewsArticle,
  SyncPlayerStat,
  SyncRosterTeam,
  SyncTeamStats,
  SyncedInjuries,
  SyncedMatches,
  SyncedNews,
  SyncedRosters,
} from "../data/espn-segunda-types";
import { parseSummary, sameTeam, splitScoreboard, type EspnScoreboardMatch, type EspnSideLineup } from "../domain/espn-soccer";

// Unofficial ESPN API (no key). Every request is optional: a failure is recorded in metadata.errors and the stored data stays.
const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.2";
const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/esp.2/standings";
const SOURCE = "ESPN (API no oficial)";
const SEASON = "2026-27";
const REQUEST_GAP_MS = 1000;
const TIMEOUT_MS = 10_000;
const REGULAR_MINUTES = 90;
const INJURY_WORDS = /injur|lesion|sanci|suspen|ruptur|ruled out|out for|banned|baja/i;

const dataDir = resolve(process.cwd(), "data/generated");
const snapshotPath = resolve(dataDir, "real-data.json");
const matchesPath = resolve(dataDir, "espn-segunda-matches.json");
const injuriesPath = resolve(dataDir, "espn-segunda-injuries.json");
const newsPath = resolve(dataDir, "espn-segunda-news.json");
const rostersPath = resolve(dataDir, "espn-segunda-rosters.json");

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const utcDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);

let lastRequestAt = 0;
async function getJson(url: string): Promise<unknown> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Runs one step; a failure is recorded and the run goes on with the stored data.
async function attempt<T>(errors: string[], label: string, work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : "error desconocido"}`);
    return null;
  }
}

async function readStored<T>(path: string, errors: string[]): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") errors.push(`${path}: no se pudo leer el archivo guardado`);
    return null;
  }
}

async function writeJson(path: string, value: unknown) {
  // Write-then-rename: a crash mid-write must not leave truncated JSON behind.
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

const metadata = (errors: string[]): SyncMetadata => ({ fetchedAt: new Date().toISOString(), source: SOURCE, season: SEASON, errors });

const toNumber = (value: number | string | null | undefined): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// ESPN clocks look like "5'" or "45'+2'"; stoppage time is added to the base minute.
function parseMinute(clock: string | null | undefined): number | null {
  const match = /^(\d+)'?(?:\+(\d+)'?)?/.exec(clock ?? "");
  return match ? Number(match[1]) + Number(match[2] ?? 0) : null;
}

const statSchema = z.object({ name: z.string(), value: z.number().nullish(), displayValue: z.string().nullish() });

const rawSummarySchema = z.object({
  rosters: z.array(z.object({
    team: z.object({ displayName: z.string() }),
    roster: z.array(z.object({
      starter: z.boolean().nullish(),
      subbedIn: z.boolean().nullish(),
      subbedOut: z.boolean().nullish(),
      athlete: z.object({ id: z.string().nullish(), displayName: z.string() }),
      stats: z.array(statSchema).nullish(),
    })).default([]),
  })).default([]),
  keyEvents: z.array(z.object({
    type: z.object({ text: z.string().nullish() }).nullish(),
    clock: z.object({ displayValue: z.string().nullish() }).nullish(),
    // Verified on a saved summary: participants[0] is the player coming on, participants[1] the player going off.
    participants: z.array(z.object({ athlete: z.object({ id: z.string().nullish() }).nullish() })).default([]),
  })).default([]),
  boxscore: z.object({
    teams: z.array(z.object({
      team: z.object({ displayName: z.string() }),
      statistics: z.array(statSchema).default([]),
    })).default([]),
  }).nullish(),
});

type RawSummary = z.infer<typeof rawSummarySchema>;
type Substitution = { minute: number | null; inId: string | null; outId: string | null };

const statValue = (stat: z.infer<typeof statSchema> | undefined) => (stat ? toNumber(stat.value ?? stat.displayValue) : null);

// Minutes are regular time only (extra time is not counted). Rules:
// - never on the pitch (bench, not subbed on): 0, the roster flags say so explicitly.
// - starter not subbed off: 90. Starter subbed off at m: m.
// - subbed on at m: 90 - m (0 when the sub came in stoppage time).
// - a Substitution keyEvent is missing for a flagged player: null.
// shortcut: a starter sent off is counted as 90 minutes; red card keyEvents are not parsed, upgrade when needed.
function minutesPlayed(entry: RawSummary["rosters"][number]["roster"][number], id: string | null, substitutions: Substitution[], completed: boolean): number | null {
  if (!completed) return null;
  if (entry.subbedIn === true && entry.subbedOut === true) return null;
  if (entry.subbedIn === true) {
    const minute = substitutions.find((sub) => sub.inId === id)?.minute ?? null;
    return minute === null ? null : Math.max(0, REGULAR_MINUTES - minute);
  }
  if (entry.starter !== true) return 0;
  if (entry.subbedOut === true) {
    const minute = substitutions.find((sub) => sub.outId === id)?.minute ?? null;
    return minute === null ? null : Math.min(minute, REGULAR_MINUTES);
  }
  return REGULAR_MINUTES;
}

function playersOf(teamName: string, roster: RawSummary["rosters"][number]["roster"], substitutions: Substitution[], completed: boolean): SyncPlayerStat[] {
  return roster.flatMap((entry) => {
    const stats = entry.stats ?? [];
    // No stats array (or an empty one) means ESPN gave no numbers for this player: skip, do not invent zeros.
    if (stats.length === 0) return [];
    const count = (name: string) => statValue(stats.find((stat) => stat.name === name)) ?? 0;
    const id = entry.athlete.id ?? null;
    return [{
      teamName,
      name: entry.athlete.displayName,
      espnId: id,
      starter: entry.starter === true,
      subbedIn: entry.subbedIn === true,
      subbedOut: entry.subbedOut === true,
      minutes: minutesPlayed(entry, id, substitutions, completed),
      // A stat missing from stats[] counts as 0 because the stats array exists.
      appearances: count("appearances"),
      goals: count("totalGoals"),
      assists: count("goalAssists"),
      yellowCards: count("yellowCards"),
      redCards: count("redCards"),
      totalShots: count("totalShots"),
      shotsOnTarget: count("shotsOnTarget"),
      saves: count("saves"),
      goalsConceded: count("goalsConceded"),
    }];
  });
}

function teamStatsFor(raw: RawSummary, teamName: string): SyncTeamStats | null {
  const team = raw.boxscore?.teams.find((item) => item.team.displayName === teamName);
  if (!team) return null;
  const value = (name: string) => statValue(team.statistics.find((stat) => stat.name === name));
  return {
    possessionPct: value("possessionPct"),
    totalShots: value("totalShots"),
    shotsOnTarget: value("shotsOnTarget"),
    foulsCommitted: value("foulsCommitted"),
    yellowCards: value("yellowCards"),
    redCards: value("redCards"),
    wonCorners: value("wonCorners"),
    offsides: value("offsides"),
    saves: value("saves"),
  };
}

const cardOf = (type: string): SyncEvent["card"] => (type.includes("Yellow") ? "YELLOW" : type.includes("Red") ? "RED" : null);
const sideLineup = (lineup: EspnSideLineup | null) => (lineup ? { starters: lineup.starters, bench: lineup.bench } : null);

export function buildMatch(event: EspnScoreboardMatch, json: unknown): SyncMatch {
  const summary = parseSummary(json);
  const raw = rawSummarySchema.parse(json);
  const substitutions: Substitution[] = raw.keyEvents
    .filter((item) => /substitution/i.test(item.type?.text ?? ""))
    .map((item) => ({
      minute: parseMinute(item.clock?.displayValue),
      inId: item.participants[0]?.athlete?.id ?? null,
      outId: item.participants[1]?.athlete?.id ?? null,
    }));
  return {
    espnId: event.espnId,
    date: event.kickoffAt ? utcDate(event.kickoffAt) : null,
    state: event.state,
    completed: event.completed,
    home: { name: event.home.name, score: event.home.score },
    away: { name: event.away.name, score: event.away.score },
    round: null,
    lineups: { home: sideLineup(summary.lineups.home), away: sideLineup(summary.lineups.away) },
    events: summary.events.map((item) => ({
      minute: item.minute,
      type: item.type,
      text: item.text,
      teamName: item.teamName,
      scoring: item.scoring,
      card: cardOf(item.type),
    })),
    teamStats: { home: teamStatsFor(raw, event.home.name), away: teamStatsFor(raw, event.away.name) },
    players: raw.rosters.flatMap((side) => playersOf(side.team.displayName, side.roster, substitutions, event.completed)),
  };
}

type CalendarFixture = RealDataSnapshot["fixtures"][number];

// Round comes from the calendar: same UTC date and both team names. Null when no fixture matches.
function roundFor(fixtures: CalendarFixture[], match: Pick<SyncMatch, "date" | "home" | "away">): number | null {
  if (!match.date) return null;
  const fixture = fixtures.find((item) => utcDate(item.kickoffAt) === match.date
    && sameTeam(item.homeTeam.name, match.home.name)
    && sameTeam(item.awayTeam.name, match.away.name));
  return fixture?.round ?? null;
}

const textOf = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

const athleteSchema = z.object({
  id: z.string().nullish(),
  displayName: z.string(),
  status: z.object({ type: z.string().nullish() }).nullish(),
  injuries: z.array(z.record(z.string(), z.unknown())).nullish(),
  // catch: a malformed optional field must not fail the whole team, injuries included.
  position: z.object({ abbreviation: z.string().nullish() }).nullish().catch(null),
  jersey: z.coerce.string().nullish().catch(null),
});

// First injury's details, else its type text. Null when ESPN gives neither.
const injuryDetailOf = (injury: Record<string, unknown> | undefined) => {
  const typeValue = injury?.type;
  const typeText = typeof typeValue === "object" && typeValue !== null ? (typeValue as { text?: unknown }).text : undefined;
  return textOf(injury?.details) ?? textOf(typeText);
};

export function parseInjuries(teamName: string, json: unknown): SyncInjury[] {
  return z.object({ athletes: z.array(athleteSchema).default([]) }).parse(json).athletes.flatMap((athlete) => {
    const type = athlete.status?.type ?? null;
    const injuries = athlete.injuries ?? [];
    // A missing status with no injuries is not evidence of an absence, so it is not reported.
    if (injuries.length === 0 && (type === null || type === "active")) return [];
    return [{
      teamName,
      name: athlete.displayName,
      espnId: athlete.id ?? null,
      status: type ?? "unknown",
      detail: injuryDetailOf(injuries[0]),
    }];
  });
}

// Every athlete, not only the unavailable ones: the probable XI needs the whole squad.
export function parseRoster(teamName: string, espnTeamId: string, json: unknown): SyncRosterTeam {
  const athletes = z.object({ athletes: z.array(athleteSchema).default([]) }).parse(json).athletes;
  return {
    teamName,
    espnTeamId,
    athletes: athletes.map((athlete) => ({
      espnId: athlete.id ?? "",
      name: athlete.displayName,
      position: athlete.position?.abbreviation ?? null,
      jersey: athlete.jersey ?? null,
      status: athlete.status?.type ?? "unknown",
      injuryDetail: injuryDetailOf(athlete.injuries?.[0]),
    })),
  };
}

// Standings nest teams under children[].standings.entries[].team; walking the tree avoids pinning that path.
export function collectTeams(node: unknown, found = new Map<string, string>()): Map<string, string> {
  if (Array.isArray(node)) {
    for (const item of node) collectTeams(item, found);
    return found;
  }
  if (typeof node !== "object" || node === null) return found;
  const team = z.object({ id: z.string(), displayName: z.string() }).safeParse((node as { team?: unknown }).team);
  if (team.success) found.set(team.data.id, team.data.displayName);
  for (const value of Object.values(node as Record<string, unknown>)) collectTeams(value, found);
  return found;
}

export function parseNews(json: unknown): SyncNewsArticle[] {
  const articles = z.object({
    articles: z.array(z.object({
      headline: z.string(),
      description: z.string().nullish(),
      published: z.string(),
      links: z.object({ web: z.object({ href: z.string().nullish() }).nullish() }).nullish(),
    })).default([]),
  }).parse(json).articles;
  return articles.map((article) => ({
    headline: article.headline,
    published: article.published,
    link: article.links?.web?.href ?? null,
    // Keyword hint only; the page must say "pendiente de confirmar".
    injuryCandidate: INJURY_WORDS.test(`${article.headline} ${article.description ?? ""}`),
  }));
}

async function main() {
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as RealDataSnapshot;
  const fixtures = snapshot.fixtures;
  const dates = [...new Set(fixtures.map((fixture) => utcDate(fixture.kickoffAt)))].sort();

  // Matches: stored completed matches are kept as they are; everything else is refetched.
  const matchErrors: string[] = [];
  const storedMatches = await readStored<SyncedMatches>(matchesPath, matchErrors);
  const byId = new Map<string, SyncMatch>();
  for (const match of Array.isArray(storedMatches?.matches) ? storedMatches.matches : []) byId.set(match.espnId, match);

  for (const date of dates) {
    const board = await attempt(matchErrors, `calendario ${date}`, async () =>
      splitScoreboard(await getJson(`${BASE_URL}/scoreboard?dates=${date.replaceAll("-", "")}`)));
    if (!board) continue;
    matchErrors.push(...board.errors.map((error) => `calendario ${date}: ${error}`));
    for (const event of board.matches) {
      if (byId.get(event.espnId)?.completed) continue;
      const match = await attempt(matchErrors, `resumen ${event.espnId}`, async () =>
        buildMatch(event, await getJson(`${BASE_URL}/summary?event=${event.espnId}`)));
      if (match) byId.set(event.espnId, match);
    }
  }
  const matches = [...byId.values()]
    .map((match) => ({ ...match, round: roundFor(fixtures, match) }))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || Number(a.espnId) - Number(b.espnId));

  // Injuries and rosters: a team whose roster fails keeps its previous entries.
  const rosterErrors: string[] = [];
  const storedInjuries = await readStored<SyncedInjuries>(injuriesPath, rosterErrors);
  const previousInjuries = Array.isArray(storedInjuries?.injuries) ? storedInjuries.injuries : [];
  const storedRosters = await readStored<SyncedRosters>(rostersPath, rosterErrors);
  const previousRosters = Array.isArray(storedRosters?.teams) ? storedRosters.teams : [];
  const teams = (await attempt(rosterErrors, "clasificación", async () => collectTeams(await getJson(STANDINGS_URL)))) ?? new Map<string, string>();
  const refreshed = new Map<string, SyncInjury[]>();
  const refreshedRosters = new Map<string, SyncRosterTeam>();
  for (const [teamId, teamName] of teams) {
    const found = await attempt(rosterErrors, `plantilla ${teamName}`, async () => {
      const json = await getJson(`${BASE_URL}/teams/${teamId}/roster`);
      return { injuries: parseInjuries(teamName, json), roster: parseRoster(teamName, teamId, json) };
    });
    if (!found) continue;
    refreshed.set(teamName, found.injuries);
    refreshedRosters.set(teamName, found.roster);
  }
  const injuries = [
    ...previousInjuries.filter((injury) => !refreshed.has(injury.teamName)),
    ...[...refreshed.values()].flat(),
  ];
  const rosters = [
    ...previousRosters.filter((team) => !refreshedRosters.has(team.teamName)),
    ...[...refreshedRosters.values()],
  ];

  // News: a failed fetch keeps the previous articles.
  const newsErrors: string[] = [];
  const storedNews = await readStored<SyncedNews>(newsPath, newsErrors);
  const previousArticles = Array.isArray(storedNews?.articles) ? storedNews.articles : [];
  const articles = (await attempt(newsErrors, "noticias", async () =>
    parseNews(await getJson(`${BASE_URL}/news?limit=50`)))) ?? previousArticles;

  await writeJson(matchesPath, { metadata: metadata(matchErrors), matches } satisfies SyncedMatches);
  await writeJson(injuriesPath, { metadata: metadata(rosterErrors), injuries } satisfies SyncedInjuries);
  await writeJson(rostersPath, { metadata: metadata(rosterErrors), teams: rosters } satisfies SyncedRosters);
  await writeJson(newsPath, { metadata: metadata(newsErrors), articles } satisfies SyncedNews);

  const finished = matches.filter((match) => match.completed).length;
  const errors = matchErrors.length + rosterErrors.length + newsErrors.length;
  console.log(`Partidos: ${matches.length} (${finished} terminados). Bajas y sanciones: ${injuries.length}. Noticias: ${articles.length}. Errores: ${errors}.`);
}

// Only run when executed directly, so the parsers can be imported and tested without network.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(`[espn/segunda] ${error instanceof Error ? error.message : "error desconocido"}`);
    process.exitCode = 1;
  });
}
