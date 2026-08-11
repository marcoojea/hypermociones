import { z } from "zod";
import type { Position } from "@/domain/player";
import type { FootballDataProvider, ProviderCompetition, ProviderFixture, ProviderPlayer, ProviderPlayerAggregate, ProviderTeam } from "./football-data-provider";

const API_BASE_URL = "https://v3.football.api-sports.io";
const pagingSchema = z.object({ current: z.number(), total: z.number() });
const leagueItemSchema = z.object({ league: z.object({ id: z.number(), name: z.string() }), country: z.object({ code: z.string().nullable() }), seasons: z.array(z.object({ year: z.number(), start: z.string(), end: z.string(), current: z.boolean(), coverage: z.record(z.string(), z.unknown()).optional() })) });
const leagueResponseSchema = z.object({ response: z.array(leagueItemSchema) });
const teamItemSchema = z.object({ team: z.object({ id: z.number(), name: z.string(), code: z.string().nullable(), logo: z.string().nullable() }) });
const teamsResponseSchema = z.object({ response: z.array(teamItemSchema) });
const playerItemSchema = z.object({ player: z.object({ id: z.number(), name: z.string(), age: z.number().nullable(), nationality: z.string().nullable(), injured: z.boolean().optional().default(false), birth: z.object({ date: z.string().nullable() }) }), statistics: z.array(z.object({ team: z.object({ id: z.number() }), games: z.object({ appearences: z.number().nullable(), lineups: z.number().nullable(), minutes: z.number().nullable(), number: z.number().nullable(), position: z.string().nullable() }), shots: z.object({ total: z.number().nullable() }), goals: z.object({ total: z.number().nullable(), assists: z.number().nullable() }), passes: z.object({ key: z.number().nullable() }) })) });
const playersResponseSchema = z.object({ paging: pagingSchema, response: z.array(playerItemSchema) });
const fixtureItemSchema = z.object({ fixture: z.object({ id: z.number(), date: z.string(), status: z.object({ short: z.string() }) }), league: z.object({ round: z.string().nullable() }), teams: z.object({ home: z.object({ id: z.number() }), away: z.object({ id: z.number() }) }), goals: z.object({ home: z.number().nullable(), away: z.number().nullable() }) });
const fixturesResponseSchema = z.object({ response: z.array(fixtureItemSchema) });

function normalizePosition(value: string | null): Position {
  if (value === "G" || value?.toLowerCase().includes("goal")) return "POR";
  if (value === "D" || value?.toLowerCase().includes("def")) return "DEF";
  if (value === "M" || value?.toLowerCase().includes("mid")) return "MED";
  return "DEL";
}
function normalizeStatus(value: string) {
  if (["FT", "AET", "PEN"].includes(value)) return "FINISHED";
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(value)) return "IN_PLAY";
  if (["PST", "SUSP", "INT"].includes(value)) return "POSTPONED";
  if (["CANC", "ABD", "AWD", "WO"].includes(value)) return "CANCELLED";
  return "TIMED";
}
const roundNumber = (value: string | null) => value ? Number(value.match(/(\d+)\s*$/)?.[1] ?? NaN) || null : null;

export class ApiFootballProvider implements FootballDataProvider {
  readonly code = "api-football";
  private nextRequestAt = 0;
  private leagueCache = new Map<number, Promise<z.infer<typeof leagueItemSchema>>>();
  private teamsCache = new Map<number, Promise<readonly ProviderTeam[]>>();
  private aggregates = new Map<string, ProviderPlayerAggregate>();
  private readonly apiKey: string;
  private readonly leagueName: string;
  private readonly minimumRequestIntervalMs: number;
  constructor(apiKey: string, leagueName = "Segunda División", minimumRequestIntervalMs = 6500) {
    if (!apiKey.trim()) throw new Error("API_FOOTBALL_API_KEY no está configurado.");
    this.apiKey = apiKey;
    this.leagueName = leagueName;
    this.minimumRequestIntervalMs = minimumRequestIntervalMs;
  }

  private async request(path: string): Promise<unknown> {
    const waitMs = Math.max(this.nextRequestAt - Date.now(), 0);
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.nextRequestAt = Date.now() + this.minimumRequestIntervalMs;
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { "x-apisports-key": this.apiKey, Accept: "application/json", Connection: "close" } });
    if (!response.ok) throw new Error(`API-Football respondió ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return response.json();
  }

  private getLeague(seasonStartYear: number) {
    const cached = this.leagueCache.get(seasonStartYear); if (cached) return cached;
    const request = (async () => {
      const query = new URLSearchParams({ country: "Spain", season: String(seasonStartYear), name: this.leagueName });
      const payload = leagueResponseSchema.parse(await this.request(`/leagues?${query}`));
      const item = payload.response.find((entry) => entry.league.name.toLocaleLowerCase("es").includes("segunda"));
      if (!item) throw new Error(`API-Football no devolvió Segunda División para ${seasonStartYear}.`);
      return item;
    })();
    this.leagueCache.set(seasonStartYear, request); return request;
  }

  async getCompetition(seasonStartYear: number): Promise<ProviderCompetition> {
    const item = await this.getLeague(seasonStartYear); const season = item.seasons.find((entry) => entry.year === seasonStartYear);
    if (!season) throw new Error(`La temporada ${seasonStartYear} no está disponible en API-Football.`);
    return { externalId: String(item.league.id), code: String(item.league.id), name: item.league.name, countryCode: item.country.code ?? "ESP", season: { externalId: `${item.league.id}-${season.year}`, name: `${season.year}/${String(season.year + 1).slice(-2)}`, startsOn: season.start, endsOn: season.end, currentRound: null } };
  }

  async getTeams(seasonStartYear: number): Promise<readonly ProviderTeam[]> {
    const cached = this.teamsCache.get(seasonStartYear); if (cached) return cached;
    const request = (async () => {
      const league = await this.getLeague(seasonStartYear); const query = new URLSearchParams({ league: String(league.league.id), season: String(seasonStartYear) });
      const teamsPayload = teamsResponseSchema.parse(await this.request(`/teams?${query}`));
      const playersByTeam = new Map<string, ProviderPlayer[]>();
      let page = 1; let totalPages = 1;
      do {
        const playersPayload = playersResponseSchema.parse(await this.request(`/players?${query}&page=${page}`)); totalPages = playersPayload.paging.total;
        for (const item of playersPayload.response) {
          const stats = item.statistics[0]; if (!stats) continue; const teamExternalId = String(stats.team.id);
          const list = playersByTeam.get(teamExternalId) ?? [];
          list.push({ externalId: String(item.player.id), teamExternalId, name: item.player.name, position: normalizePosition(stats.games.position), rawPosition: stats.games.position, shirtNumber: stats.games.number, nationality: item.player.nationality, birthDate: item.player.birth.date, status: item.player.injured ? "INJURED" : "UNKNOWN" });
          playersByTeam.set(teamExternalId, list);
          this.aggregates.set(String(item.player.id), { playerExternalId: String(item.player.id), appearances: stats.games.appearences ?? 0, starts: stats.games.lineups ?? 0, minutes: stats.games.minutes ?? 0, goals: stats.goals.total ?? 0, assists: stats.goals.assists ?? 0, shots: stats.shots.total, keyPasses: stats.passes.key });
        }
        page += 1;
      } while (page <= totalPages);
      return teamsPayload.response.map(({ team }) => ({ externalId: String(team.id), name: team.name, shortName: team.name, tla: team.code, crestUrl: team.logo, players: playersByTeam.get(String(team.id)) ?? [] }));
    })();
    this.teamsCache.set(seasonStartYear, request); return request;
  }

  async getFixtures(seasonStartYear: number): Promise<readonly ProviderFixture[]> {
    const league = await this.getLeague(seasonStartYear); const query = new URLSearchParams({ league: String(league.league.id), season: String(seasonStartYear) });
    const payload = fixturesResponseSchema.parse(await this.request(`/fixtures?${query}`));
    return payload.response.map((item) => ({ externalId: String(item.fixture.id), round: roundNumber(item.league.round), kickoffAt: item.fixture.date, status: normalizeStatus(item.fixture.status.short), homeTeamExternalId: String(item.teams.home.id), awayTeamExternalId: String(item.teams.away.id), homeScore: item.goals.home, awayScore: item.goals.away }));
  }

  async getPlayerAggregate(playerExternalId: string): Promise<ProviderPlayerAggregate> {
    const aggregate = this.aggregates.get(playerExternalId); if (!aggregate) throw new Error(`No se encontró el agregado del jugador ${playerExternalId}.`);
    return aggregate;
  }
}
