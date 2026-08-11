import type { Position } from "@/domain/player";
import type { FootballDataProvider, ProviderCompetition, ProviderFixture, ProviderPlayer, ProviderPlayerAggregate, ProviderTeam } from "./football-data-provider";

const RFEF_WIDGET_URL = "https://widgets.besoccerapps.com/scripts/widgets";

const teams = [
  ["140", "Albacete Balompié", "ALB"], ["183", "UD Almería", "ALM"], ["9501", "FC Andorra", "AND"],
  ["565", "Burgos CF", "BUR"], ["603", "Cádiz CF", "CAD"], ["673", "CD Castellón", "CAS"],
  ["713", "RC Celta Fortuna", "CEL"], ["665", "AD Ceuta FC", "CEU"], ["831", "Córdoba CF", "COR"],
  ["957", "SD Eibar", "EIB"], ["977", "CD Eldense", "ELD"], ["1236", "Girona FC", "GIR"],
  ["4235", "Granada CF", "GRA"], ["2563", "UD Las Palmas", "LPA"], ["1535", "CD Leganés", "LEG"],
  ["1623", "RCD Mallorca", "MLL"], ["2115", "Real Oviedo", "OVI"], ["2121", "Real Sociedad de Fútbol B", "RSB"],
  ["2198", "CE Sabadell FC", "SAB"], ["2125", "Real Sporting de Gijón", "SPO"], ["2477", "CD Tenerife", "TEN"],
  ["2654", "Real Valladolid CF", "VLL"],
] as const;

const idByName = new Map(teams.map(([id, name]) => [name, id]));
const scheduledRounds = [
  { round: 1, date: "2026-08-16", matches: [
    ["UD Almería", "CD Eldense"], ["FC Andorra", "AD Ceuta FC"], ["Burgos CF", "Córdoba CF"],
    ["Cádiz CF", "RC Celta Fortuna"], ["SD Eibar", "CD Tenerife"], ["Girona FC", "CD Leganés"],
    ["UD Las Palmas", "Albacete Balompié"], ["RCD Mallorca", "Real Valladolid CF"], ["Real Oviedo", "Granada CF"],
    ["Real Sociedad de Fútbol B", "CD Castellón"], ["Real Sporting de Gijón", "CE Sabadell FC"],
  ] },
  { round: 2, date: "2026-08-23", matches: [
    ["Albacete Balompié", "Real Sociedad de Fútbol B"], ["CD Castellón", "CE Sabadell FC"], ["RC Celta Fortuna", "FC Andorra"],
    ["AD Ceuta FC", "UD Las Palmas"], ["Córdoba CF", "Girona FC"], ["SD Eibar", "Real Valladolid CF"],
    ["CD Eldense", "Cádiz CF"], ["Granada CF", "RCD Mallorca"], ["Real Oviedo", "CD Leganés"],
    ["Real Sporting de Gijón", "Burgos CF"], ["CD Tenerife", "UD Almería"],
  ] },
] as const;

const decodeHtml = (value: string) => value
  .replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"")
  .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code))).trim();

const numberOrNull = (value: string | undefined) => {
  const parsed = Number(value?.replace(/<[^>]*>/g, "").trim());
  return value && value.trim() !== "-" && Number.isFinite(parsed) ? parsed : null;
};

const positionByCode = (code: string | undefined): Position => code === "1" ? "POR" : code === "2" ? "DEF" : code === "3" ? "MED" : "DEL";
const rawPositionByCode = (code: string | undefined) => code === "1" ? "Portero" : code === "2" ? "Defensa" : code === "3" ? "Medio" : "Delantero";

export function parseRfefTeamWidget(html: string, teamExternalId: string) {
  const players: ProviderPlayer[] = [];
  const aggregates = new Map<string, ProviderPlayerAggregate>();
  for (const match of html.matchAll(/<tr[^>]*itemprop="employee"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const row = match[1];
    const href = row.match(/content="\/jugador\/([^"]+)"/)?.[1];
    const externalId = href?.match(/-(\d+)$/)?.[1] ?? href;
    const name = row.match(/<span[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/span>/)?.[1];
    if (!externalId || !name) continue;
    const positionCode = row.match(/bi-position-(\d+)/)?.[1];
    const cells = [...row.matchAll(/<td[^>]*class="dat"[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]);
    const shirtContent = row.match(/itemprop="dorsal"[^>]*content="([^"]*)"/)?.[1];
    const nationality = row.match(/itemprop="nationality"[\s\S]*?<span[^>]*content="([^"]*)"/)?.[1] ?? null;
    players.push({ externalId, teamExternalId, name: decodeHtml(name), position: positionByCode(positionCode), rawPosition: rawPositionByCode(positionCode),
      shirtNumber: numberOrNull(shirtContent), nationality, birthDate: null, age: numberOrNull(cells[1]),
      heightCm: numberOrNull(cells[2]), weightKg: numberOrNull(cells[3]), status: "UNKNOWN" });
    aggregates.set(externalId, { playerExternalId: externalId, appearances: null, starts: null, minutes: null,
      goals: numberOrNull(cells[4]), assists: null, redCards: numberOrNull(cells[5]), yellowCards: numberOrNull(cells[6]) });
  }
  return { players, aggregates };
}

export class FreePublicProvider implements FootballDataProvider {
  readonly code = "RFEF (plantillas oficiales)";
  private teamsCache: Promise<readonly ProviderTeam[]> | null = null;
  private readonly aggregates = new Map<string, ProviderPlayerAggregate>();
  private requestQueue: Promise<void> = Promise.resolve();
  private readonly requestIntervalMs: number;
  constructor(requestIntervalMs = 500) { this.requestIntervalMs = requestIntervalMs; }

  private requestPlayers(teamId: string): Promise<ProviderPlayer[]> {
    let resolveRequest!: (players: ProviderPlayer[]) => void;
    let rejectRequest!: (error: unknown) => void;
    const result = new Promise<ProviderPlayer[]>((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; });
    this.requestQueue = this.requestQueue.then(async () => {
      try {
        const query = new URLSearchParams({ type: "team_info", competition: "2", team: teamId, style: "rfef" });
        const response = await fetch(`${RFEF_WIDGET_URL}?${query}`, { headers: { Accept: "text/html", "User-Agent": "Hypermociones/0.1 (plantillas RFEF; caché local)" } });
        if (!response.ok) throw new Error(`La ficha RFEF respondió ${response.status} para el equipo ${teamId}.`);
        const parsed = parseRfefTeamWidget(await response.text(), teamId);
        if (parsed.players.length === 0) throw new Error(`La ficha RFEF no devolvió jugadores para el equipo ${teamId}.`);
        for (const [playerId, aggregate] of parsed.aggregates) this.aggregates.set(playerId, aggregate);
        resolveRequest(parsed.players);
      } catch (error) { rejectRequest(error); }
      if (this.requestIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, this.requestIntervalMs));
    });
    return result;
  }

  async getCompetition(seasonStartYear: number): Promise<ProviderCompetition> {
    if (seasonStartYear !== 2026) throw new Error("El proveedor público está preparado actualmente para la temporada 2026/27.");
    return { externalId: "rfef-segunda-2026", code: "SD-2627", name: "Campeonato Nacional de Liga de Segunda División", countryCode: "ESP",
      season: { externalId: "2026-27", name: "2026/27", startsOn: "2026-08-16", endsOn: "2027-05-30", currentRound: 1 } };
  }

  async getTeams(): Promise<readonly ProviderTeam[]> {
    if (!this.teamsCache) this.teamsCache = Promise.all(teams.map(async ([externalId, name, tla]) => ({ externalId, name, shortName: name, tla,
      crestUrl: null, players: await this.requestPlayers(externalId) })));
    return this.teamsCache;
  }

  async getFixtures(): Promise<readonly ProviderFixture[]> {
    return scheduledRounds.flatMap(({ round, date, matches }) => matches.map(([home, away], index) => ({ externalId: `rfef-2627-${round}-${index + 1}`,
      round, kickoffAt: `${date}T12:00:00+02:00`, status: "SCHEDULED", homeTeamExternalId: idByName.get(home)!,
      awayTeamExternalId: idByName.get(away)!, homeScore: null, awayScore: null })));
  }

  async getPlayerAggregate(playerExternalId: string): Promise<ProviderPlayerAggregate> {
    return this.aggregates.get(playerExternalId) ?? { playerExternalId, appearances: null, starts: null, minutes: null, goals: null, assists: null };
  }
}
