import type { FixtureStatus } from "@/domain/fixture";
import type { PlayerListItem, TeamSummary } from "@/domain/player";
import type { RealDataSnapshot } from "@/data/real-data-types";
import type { FootballDataProvider, ProviderPlayerAggregate } from "./football-data-provider";

const palette = ["#d9e6d5", "#f3d55b", "#d7e7f5", "#efc6c2", "#d8cbe8", "#cfe8e2"];

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ageOnDate(birthDate: string | null, reference: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`); const at = new Date(reference);
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  if (at.getUTCMonth() < birth.getUTCMonth() || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function fixtureStatus(value: string): FixtureStatus {
  const supported: FixtureStatus[] = ["SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "FINISHED", "POSTPONED", "SUSPENDED", "CANCELLED"];
  return supported.includes(value as FixtureStatus) ? value as FixtureStatus : "SCHEDULED";
}

export async function buildRealDataSnapshot(provider: FootballDataProvider, seasonStartYear: number, includePlayerAggregates: boolean): Promise<RealDataSnapshot> {
  const competition = await provider.getCompetition(seasonStartYear);
  const [providerTeams, providerFixtures] = await Promise.all([provider.getTeams(seasonStartYear), provider.getFixtures(seasonStartYear)]);
  const teams: TeamSummary[] = providerTeams.map((team, index) => ({ id: `fd-team-${team.externalId}`, name: team.name, shortName: team.tla ?? team.shortName.slice(0, 3).toLocaleUpperCase("es"), slug: `${slugify(team.shortName)}-${team.externalId}`, primaryColor: palette[index % palette.length], crestUrl: team.crestUrl }));
  const teamByExternalId = new Map(providerTeams.map((team, index) => [team.externalId, teams[index]]));
  const aggregates = new Map<string, ProviderPlayerAggregate>();
  if (includePlayerAggregates) {
    for (const team of providerTeams) for (const player of team.players) aggregates.set(player.externalId, await provider.getPlayerAggregate(player.externalId, competition));
  }
  const nextFixtureByTeam = new Map<string, (typeof providerFixtures)[number]>();
  for (const fixture of providerFixtures.filter((item) => item.status === "SCHEDULED" || item.status === "TIMED").sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))) {
    if (!nextFixtureByTeam.has(fixture.homeTeamExternalId)) nextFixtureByTeam.set(fixture.homeTeamExternalId, fixture);
    if (!nextFixtureByTeam.has(fixture.awayTeamExternalId)) nextFixtureByTeam.set(fixture.awayTeamExternalId, fixture);
  }
  const players: PlayerListItem[] = providerTeams.flatMap((providerTeam) => {
    const team = teamByExternalId.get(providerTeam.externalId);
    if (!team) return [];
    return providerTeam.players.map((player): PlayerListItem => {
      const aggregate = aggregates.get(player.externalId); const next = nextFixtureByTeam.get(providerTeam.externalId);
      const opponentId = next ? (next.homeTeamExternalId === providerTeam.externalId ? next.awayTeamExternalId : next.homeTeamExternalId) : null;
      const opponent = opponentId ? teamByExternalId.get(opponentId) : null;
      return { id: `fd-player-${player.externalId}`, slug: `${slugify(player.name)}-${player.externalId}`, name: player.name, shirtNumber: player.shirtNumber, nationality: player.nationality ?? "No disponible", age: player.age ?? ageOnDate(player.birthDate, competition.season.startsOn), heightCm: player.heightCm ?? null, weightKg: player.weightKg ?? null, position: player.position, status: player.status ?? "UNKNOWN", team, appearances: aggregate?.appearances ?? null, starts: aggregate?.starts ?? null, minutes: aggregate?.minutes ?? null, goals: aggregate?.goals ?? null, assists: aggregate?.assists ?? null, xg: null, xa: null, xgi: null, shots: aggregate?.shots ?? null, keyPasses: aggregate?.keyPasses ?? null, cleanSheets: null, yellowCards: aggregate?.yellowCards ?? null, redCards: aggregate?.redCards ?? null, fantasyPoints: null, pointsPerGame: null, form: null, fis: null, nextOpponent: opponent ? `${next?.homeTeamExternalId === providerTeam.externalId ? "vs" : "@"} ${opponent.shortName}` : null, fixtureDifficulty: null, recentMinutes: [], recentPoints: [], strengths: [`Plantilla ${competition.season.name} obtenida de ${provider.code}`], risks: player.status === "INJURED" ? ["Marcado como lesionado por el proveedor"] : ["Disponibilidad competitiva pendiente de la información oficial"] };
    });
  });
  const fixtures = providerFixtures.flatMap((fixture) => {
    const homeTeam = teamByExternalId.get(fixture.homeTeamExternalId); const awayTeam = teamByExternalId.get(fixture.awayTeamExternalId);
    return homeTeam && awayTeam ? [{ id: `fd-fixture-${fixture.externalId}`, externalId: fixture.externalId, round: fixture.round, kickoffAt: fixture.kickoffAt, status: fixtureStatus(fixture.status), homeTeam, awayTeam, homeScore: fixture.homeScore, awayScore: fixture.awayScore }] : [];
  });
  return { metadata: { provider: provider.code, competitionCode: competition.code, competitionExternalId: competition.externalId, seasonExternalId: competition.season.externalId, season: competition.season.name, startsOn: competition.season.startsOn, endsOn: competition.season.endsOn, importedAt: new Date().toISOString(), includesPlayerAggregates: includePlayerAggregates, unavailableMetrics: ["xG", "xA", "puntos Fantasy", "precio", "FIS"] }, teams, players, fixtures };
}
