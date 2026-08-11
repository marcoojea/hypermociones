import { z } from "zod";
import type { FootballDataProvider, ProviderCompetition, ProviderFixture, ProviderPlayerAggregate, ProviderTeam } from "./football-data-provider";
import type { Position } from "@/domain/player";

const API_BASE_URL = "https://api.football-data.org/v4";

const competitionSchema = z.object({
  id: z.number(), name: z.string(), code: z.string(), area: z.object({ code: z.string().nullable() }),
  currentSeason: z.object({ id: z.number(), startDate: z.string(), endDate: z.string(), currentMatchday: z.number().nullable() }),
});
const personSchema = z.object({ id: z.number(), name: z.string(), position: z.string().nullable(), dateOfBirth: z.string().nullable(), nationality: z.string().nullable(), shirtNumber: z.number().nullable().optional() });
const teamSchema = z.object({ id: z.number(), name: z.string(), shortName: z.string(), tla: z.string().nullable(), crest: z.string().nullable(), squad: z.array(personSchema).optional().default([]) });
const teamsResponseSchema = z.object({ teams: z.array(teamSchema) });
const matchSchema = z.object({ id: z.number(), matchday: z.number().nullable(), utcDate: z.string(), status: z.string(), homeTeam: z.object({ id: z.number() }), awayTeam: z.object({ id: z.number() }), score: z.object({ fullTime: z.object({ home: z.number().nullable(), away: z.number().nullable() }) }) });
const matchesResponseSchema = z.object({ matches: z.array(matchSchema) });
const personMatchesSchema = z.object({ aggregations: z.object({ matchesOnPitch: z.number().default(0), startingXI: z.number().default(0), minutesPlayed: z.number().default(0), goals: z.number().default(0), assists: z.number().default(0) }) });

function normalizePosition(position: string | null): Position {
  const value = position?.toLocaleLowerCase("en") ?? "";
  if (value.includes("goalkeeper")) return "POR";
  if (value.includes("defence") || value.includes("defender") || value.includes("back")) return "DEF";
  if (value.includes("midfield") || value.includes("winger")) return "MED";
  return "DEL";
}

export class FootballDataOrgProvider implements FootballDataProvider {
  readonly code = "football-data.org";
  private nextRequestAt = 0;
  private readonly token: string;
  private readonly competitionCode: string;
  private readonly minimumRequestIntervalMs: number;
  constructor(token: string, competitionCode = "SD", minimumRequestIntervalMs = 6500) {
    if (!token.trim()) throw new Error("FOOTBALL_DATA_API_TOKEN no está configurado.");
    this.token = token;
    this.competitionCode = competitionCode;
    this.minimumRequestIntervalMs = minimumRequestIntervalMs;
  }

  private async request(path: string): Promise<unknown> {
    const waitMs = Math.max(this.nextRequestAt - Date.now(), 0);
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.nextRequestAt = Date.now() + this.minimumRequestIntervalMs;
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { "X-Auth-Token": this.token, Accept: "application/json" } });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`football-data.org respondió ${response.status}: ${detail.slice(0, 300)}`);
    }
    return response.json();
  }

  async getCompetition(seasonStartYear: number): Promise<ProviderCompetition> {
    const raw = competitionSchema.parse(await this.request(`/competitions/${this.competitionCode}`));
    if (!raw.currentSeason.startDate.startsWith(String(seasonStartYear))) {
      throw new Error(`La temporada actual del proveedor empieza en ${raw.currentSeason.startDate}, no en ${seasonStartYear}.`);
    }
    return { externalId: String(raw.id), code: raw.code, name: raw.name, countryCode: raw.area.code ?? "ESP", season: { externalId: String(raw.currentSeason.id), name: `${seasonStartYear}/${String(seasonStartYear + 1).slice(-2)}`, startsOn: raw.currentSeason.startDate, endsOn: raw.currentSeason.endDate, currentRound: raw.currentSeason.currentMatchday } };
  }

  async getTeams(seasonStartYear: number): Promise<readonly ProviderTeam[]> {
    const raw = teamsResponseSchema.parse(await this.request(`/competitions/${this.competitionCode}/teams?season=${seasonStartYear}`));
    const teams = await Promise.all(raw.teams.map(async (summary) => {
      const detail = summary.squad.length ? summary : teamSchema.parse(await this.request(`/teams/${summary.id}`));
      return { externalId: String(detail.id), name: detail.name, shortName: detail.shortName, tla: detail.tla, crestUrl: detail.crest, players: detail.squad.map((player) => ({ externalId: String(player.id), teamExternalId: String(detail.id), name: player.name, position: normalizePosition(player.position), rawPosition: player.position, shirtNumber: player.shirtNumber ?? null, nationality: player.nationality, birthDate: player.dateOfBirth })) };
    }));
    return teams;
  }

  async getFixtures(seasonStartYear: number): Promise<readonly ProviderFixture[]> {
    const raw = matchesResponseSchema.parse(await this.request(`/competitions/${this.competitionCode}/matches?season=${seasonStartYear}`));
    return raw.matches.map((match) => ({ externalId: String(match.id), round: match.matchday, kickoffAt: match.utcDate, status: match.status, homeTeamExternalId: String(match.homeTeam.id), awayTeamExternalId: String(match.awayTeam.id), homeScore: match.score.fullTime.home, awayScore: match.score.fullTime.away }));
  }

  async getPlayerAggregate(playerExternalId: string, competition: ProviderCompetition): Promise<ProviderPlayerAggregate> {
    const query = new URLSearchParams({ dateFrom: competition.season.startsOn, dateTo: competition.season.endsOn, competitions: competition.externalId, limit: "100" });
    const raw = personMatchesSchema.parse(await this.request(`/persons/${playerExternalId}/matches?${query}`));
    return { playerExternalId, appearances: raw.aggregations.matchesOnPitch, starts: raw.aggregations.startingXI, minutes: raw.aggregations.minutesPlayed, goals: raw.aggregations.goals, assists: raw.aggregations.assists };
  }
}
