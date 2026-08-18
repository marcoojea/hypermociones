import { z } from "zod";

import type { LiveEvent, LiveFeed, LiveMatch, LiveMatchStatus, LivePlayerStats, LiveTeamStats } from "@/domain/live";

const API_BASE_URL = "https://v3.football.api-sports.io";
const teamSchema = z.object({ id: z.number(), name: z.string(), logo: z.string().nullable().optional() });
const eventSchema = z.object({ time: z.object({ elapsed: z.number().nullable(), extra: z.number().nullable().optional() }), team: teamSchema, player: z.object({ id: z.number().nullable(), name: z.string().nullable() }), assist: z.object({ id: z.number().nullable(), name: z.string().nullable() }).optional(), type: z.string(), detail: z.string() });
const fixtureSchema = z.object({
  fixture: z.object({ id: z.number(), date: z.string(), status: z.object({ short: z.string(), elapsed: z.number().nullable() }) }),
  teams: z.object({ home: teamSchema, away: teamSchema }),
  goals: z.object({ home: z.number().nullable(), away: z.number().nullable() }),
  events: z.array(eventSchema).optional(),
});
const fixturesResponseSchema = z.object({ response: z.array(fixtureSchema) });
const leagueResponseSchema = z.object({ response: z.array(z.object({ league: z.object({ id: z.number(), name: z.string() }), seasons: z.array(z.object({ year: z.number(), coverage: z.record(z.string(), z.unknown()).optional() })) })) });
const statisticSchema = z.object({ type: z.string(), value: z.union([z.string(), z.number()]).nullable() });
const teamStatisticsResponseSchema = z.object({ response: z.array(z.object({ team: teamSchema, statistics: z.array(statisticSchema) })) });
const playerStatisticsResponseSchema = z.object({ response: z.array(z.object({ team: teamSchema, players: z.array(z.object({
  player: z.object({ id: z.number(), name: z.string() }),
  statistics: z.array(z.object({ games: z.object({ minutes: z.number().nullable(), rating: z.string().nullable(), substitute: z.boolean() }), shots: z.object({ total: z.number().nullable(), on: z.number().nullable() }), goals: z.object({ total: z.number().nullable(), assists: z.number().nullable(), saves: z.number().nullable() }), passes: z.object({ key: z.number().nullable() }), tackles: z.object({ total: z.number().nullable(), interceptions: z.number().nullable() }), cards: z.object({ yellow: z.number(), red: z.number() }) }))
})) })) });

export class LiveProviderAccessError extends Error {
  readonly code = "LIVE_PROVIDER_ACCESS";
  constructor(message: string) {
    super(message);
    this.name = "LiveProviderAccessError";
  }
}

export function isLiveProviderAccessError(error: unknown): error is LiveProviderAccessError {
  return error instanceof LiveProviderAccessError
    || Boolean(error && typeof error === "object" && "code" in error && error.code === "LIVE_PROVIDER_ACCESS");
}

export class ApiFootballLiveProvider {
  readonly name = "API-Football";
  private nextRequestAt = 0;

  constructor(private readonly apiKey: string, private readonly minimumIntervalMs = 250) {
    if (!apiKey.trim()) throw new LiveProviderAccessError("Falta configurar la credencial del proveedor live.");
  }

  async getFeed(season: number, now = new Date()): Promise<LiveFeed> {
    const leaguePayload = leagueResponseSchema.parse(await this.request(`/leagues?${new URLSearchParams({ country: "Spain", season: String(season), name: "Segunda División" })}`));
    const league = leaguePayload.response.find((item) => item.seasons.some((candidate) => candidate.year === season));
    if (!league) throw new LiveProviderAccessError(`El plan configurado no ofrece Segunda División ${season}/${String(season + 1).slice(-2)}.`);
    const coverage = coverageFlags(league.seasons.find((candidate) => candidate.year === season)?.coverage);

    const start = isoDay(addDays(now, -3));
    const end = isoDay(addDays(now, 3));
    const fixtures = fixturesResponseSchema.parse(await this.request(`/fixtures?${new URLSearchParams({ league: String(league.league.id), season: String(season), from: start, to: end, timezone: "Europe/Madrid" })}`)).response;
    const detailed = new Set(fixtures.filter((item) => isDetailedStatus(item.fixture.status.short) || Math.abs(now.getTime() - new Date(item.fixture.date).getTime()) < 8 * 3_600_000).map((item) => item.fixture.id));
    const matches: LiveMatch[] = [];
    for (const fixture of fixtures) {
      const [teamStats, playerStats] = detailed.has(fixture.fixture.id)
        ? await Promise.all([coverage.teamStats ? this.getTeamStats(fixture.fixture.id) : [], coverage.playerStats ? this.getPlayerStats(fixture.fixture.id) : []])
        : [[], []];
      matches.push(mapFixture(fixture, teamStats, playerStats));
    }
    const hasLive = matches.some((match) => match.status === "LIVE" || match.status === "HALFTIME");
    const hasRecent = matches.some((match) => match.status === "FINISHED");
    return {
      version: 1,
      status: hasLive ? "LIVE" : hasRecent ? "RECENT" : "IDLE",
      provider: this.name,
      competition: league.league.name,
      sourceUrl: null,
      fetchedAt: now.toISOString(),
      stale: false,
      refreshAfterSeconds: hasLive ? 30 : 300,
      capabilities: { scores: true, events: coverage.events, teamStats: coverage.teamStats, playerStats: coverage.playerStats, fantasyPoints: false },
      message: hasLive ? "Partidos en juego. Marcador y minuto se refrescan automáticamente." : hasRecent ? "Sin partidos en juego; se muestran los resultados recientes." : "No hay partidos dentro de la ventana live.",
      matches,
    };
  }

  private async getTeamStats(fixtureId: number): Promise<LiveTeamStats[]> {
    const payload = teamStatisticsResponseSchema.parse(await this.request(`/fixtures/statistics?fixture=${fixtureId}`));
    return payload.response.map(({ team, statistics }) => ({ teamId: String(team.id), teamName: team.name, possession: percent(statValue(statistics, "Ball Possession")), shots: number(statValue(statistics, "Total Shots")), shotsOnTarget: number(statValue(statistics, "Shots on Goal")), corners: number(statValue(statistics, "Corner Kicks")), fouls: number(statValue(statistics, "Fouls")), saves: number(statValue(statistics, "Goalkeeper Saves")), effectiveness: null, yellowCards: number(statValue(statistics, "Yellow Cards")), redCards: number(statValue(statistics, "Red Cards")), offsides: number(statValue(statistics, "Offsides")) }));
  }

  private async getPlayerStats(fixtureId: number): Promise<LivePlayerStats[]> {
    const payload = playerStatisticsResponseSchema.parse(await this.request(`/fixtures/players?fixture=${fixtureId}`));
    return payload.response.flatMap(({ team, players }) => players.flatMap(({ player, statistics }) => statistics.slice(0, 1).map((stats) => ({ playerId: String(player.id), playerName: player.name, teamId: String(team.id), teamName: team.name, started: !stats.games.substitute, minutes: stats.games.minutes, rating: number(stats.games.rating), goals: stats.goals.total ?? 0, assists: stats.goals.assists ?? 0, shots: stats.shots.total, shotsOnTarget: stats.shots.on, keyPasses: stats.passes.key, tackles: stats.tackles.total, interceptions: stats.tackles.interceptions, saves: stats.goals.saves, yellowCards: stats.cards.yellow, redCards: stats.cards.red }))));
  }

  private async request(path: string): Promise<unknown> {
    const waitMs = Math.max(this.nextRequestAt - Date.now(), 0);
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.nextRequestAt = Date.now() + this.minimumIntervalMs;
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { "x-apisports-key": this.apiKey, Accept: "application/json", Connection: "close" } });
    const payload = await response.json() as { errors?: Record<string, unknown> };
    const providerError = payload.errors && Object.values(payload.errors).find(Boolean);
    if (!response.ok || providerError) throw new LiveProviderAccessError(typeof providerError === "string" ? providerError : `El proveedor live respondió ${response.status}.`);
    return payload;
  }
}

function mapFixture(fixture: z.infer<typeof fixtureSchema>, teamStats: LiveTeamStats[], playerStats: LivePlayerStats[]): LiveMatch {
  return { id: String(fixture.fixture.id), kickoffAt: fixture.fixture.date, status: normalizeStatus(fixture.fixture.status.short), elapsed: fixture.fixture.status.elapsed, homeTeam: { id: String(fixture.teams.home.id), name: fixture.teams.home.name, logoUrl: fixture.teams.home.logo ?? null }, awayTeam: { id: String(fixture.teams.away.id), name: fixture.teams.away.name, logoUrl: fixture.teams.away.logo ?? null }, homeScore: fixture.goals.home, awayScore: fixture.goals.away, events: (fixture.events ?? []).map(mapEvent), teamStats, playerStats };
}

function mapEvent(event: z.infer<typeof eventSchema>, index: number): LiveEvent {
  const type = event.type === "Goal" ? "GOAL" : event.type === "Card" ? "CARD" : event.type.toLowerCase().includes("subst") ? "SUBSTITUTION" : "OTHER";
  return { id: `${event.team.id}-${event.time.elapsed ?? "x"}-${index}`, minute: event.time.elapsed, extraMinute: event.time.extra ?? null, teamId: String(event.team.id), playerId: event.player.id === null ? null : String(event.player.id), playerName: event.player.name, assistName: event.assist?.name ?? null, type, detail: event.detail };
}

function normalizeStatus(status: string): LiveMatchStatus {
  if (["1H", "2H", "ET", "BT", "P", "LIVE"].includes(status)) return "LIVE";
  if (["HT", "INT"].includes(status)) return "HALFTIME";
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(status)) return "FINISHED";
  if (["PST", "SUSP"].includes(status)) return "POSTPONED";
  if (["CANC", "ABD"].includes(status)) return "CANCELLED";
  return "SCHEDULED";
}

const isDetailedStatus = (status: string) => ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(status);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const statValue = (stats: z.infer<typeof statisticSchema>[], type: string) => stats.find((stat) => stat.type === type)?.value ?? null;
const number = (value: string | number | null) => { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; };
const percent = (value: string | number | null) => number(typeof value === "string" ? value.replace("%", "") : value);
function coverageFlags(value: Record<string, unknown> | undefined) {
  const fixtures = value?.fixtures && typeof value.fixtures === "object" ? value.fixtures as Record<string, unknown> : {};
  return { events: fixtures.events === true, teamStats: fixtures.statistics_fixtures === true, playerStats: fixtures.statistics_players === true };
}
