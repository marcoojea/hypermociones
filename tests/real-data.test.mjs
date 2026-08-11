import assert from "node:assert/strict";
import test from "node:test";
import { buildRealDataSnapshot } from "../providers/football/build-real-data-snapshot.ts";
import { FootballDataOrgProvider } from "../providers/football/football-data-org.ts";
import { ApiFootballProvider } from "../providers/football/api-football.ts";
import { FreePublicProvider } from "../providers/football/free-public.ts";

const competition = { externalId: "2077", code: "SD", name: "Segunda División", countryCode: "ESP", season: { externalId: "2026", name: "2026/27", startsOn: "2026-08-15", endsOn: "2027-06-20", currentRound: 1 } };
const teams = [
  { externalId: "1", name: "Equipo Norte", shortName: "Norte", tla: "NOR", crestUrl: null, players: [{ externalId: "10", teamExternalId: "1", name: "Jugador Real", position: "MED", rawPosition: "Central Midfield", shirtNumber: 8, nationality: "Spain", birthDate: "2000-01-01" }] },
  { externalId: "2", name: "Equipo Sur", shortName: "Sur", tla: "SUR", crestUrl: null, players: [] },
];
const fixtures = [{ externalId: "99", round: 1, kickoffAt: "2026-08-16T18:00:00Z", status: "TIMED", homeTeamExternalId: "1", awayTeamExternalId: "2", homeScore: null, awayScore: null }];

function provider(aggregate) {
  return { code: "contract-test", async getCompetition() { return competition; }, async getTeams() { return teams; }, async getFixtures() { return fixtures; }, async getPlayerAggregate(playerExternalId) { return { playerExternalId, appearances: aggregate ? 2 : 0, starts: 1, minutes: 125, goals: 1, assists: 0 }; } };
}

test("builds a real snapshot without inventing unavailable metrics", async () => {
  const snapshot = await buildRealDataSnapshot(provider(false), 2026, false);
  assert.equal(snapshot.metadata.season, "2026/27");
  assert.equal(snapshot.players[0].name, "Jugador Real");
  assert.equal(snapshot.players[0].xg, null);
  assert.equal(snapshot.players[0].minutes, null);
  assert.equal(snapshot.players[0].status, "UNKNOWN");
  assert.equal(snapshot.players[0].nextOpponent, "vs SUR");
});

test("includes only aggregates explicitly returned by the provider", async () => {
  const snapshot = await buildRealDataSnapshot(provider(true), 2026, true);
  assert.equal(snapshot.players[0].minutes, 125);
  assert.equal(snapshot.players[0].goals, 1);
  assert.equal(snapshot.players[0].fis, null);
  assert.equal(snapshot.fixtures[0].status, "TIMED");
});

test("maps football-data.org competition, squad and fixture payloads", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/competitions/SD")) return Response.json({ id: 2077, name: "Segunda División", code: "SD", area: { code: "ESP" }, currentSeason: { id: 3000, startDate: "2026-08-15", endDate: "2027-06-20", currentMatchday: 1 } });
    if (path.endsWith("/teams")) return Response.json({ teams: [{ id: 1, name: "Club de Prueba", shortName: "Prueba", tla: "PRU", crest: null, squad: [{ id: 10, name: "Portero Uno", position: "Goalkeeper", dateOfBirth: "1999-02-01", nationality: "Spain", shirtNumber: 1 }] }] });
    if (path.endsWith("/matches")) return Response.json({ matches: [{ id: 99, matchday: 1, utcDate: "2026-08-16T18:00:00Z", status: "TIMED", homeTeam: { id: 1 }, awayTeam: { id: 2 }, score: { fullTime: { home: null, away: null } } }] });
    throw new Error(`Unexpected URL: ${url}`);
  };
  try {
    const api = new FootballDataOrgProvider("test-token", "SD", 0);
    const [mappedCompetition, mappedTeams, mappedFixtures] = await Promise.all([api.getCompetition(2026), api.getTeams(2026), api.getFixtures(2026)]);
    assert.equal(mappedCompetition.externalId, "2077");
    assert.equal(mappedTeams[0].players[0].position, "POR");
    assert.equal(mappedFixtures[0].externalId, "99");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("maps paginated API-Football players and season metrics", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/leagues")) return Response.json({ response: [{ league: { id: 141, name: "Segunda División" }, country: { code: "ES" }, seasons: [{ year: 2026, start: "2026-08-15", end: "2027-06-20", current: true, coverage: { players: true } }] }] });
    if (path.endsWith("/teams")) return Response.json({ response: [{ team: { id: 1, name: "Club Uno", code: "UNO", logo: null } }, { team: { id: 2, name: "Club Dos", code: "DOS", logo: null } }] });
    if (path.endsWith("/players")) return Response.json({ paging: { current: 1, total: 1 }, response: [{ player: { id: 10, name: "Jugador API", age: 24, nationality: "Spain", injured: false, birth: { date: "2002-01-01" } }, statistics: [{ team: { id: 1 }, games: { appearences: 2, lineups: 2, minutes: 180, number: 8, position: "M" }, shots: { total: 5 }, goals: { total: 1, assists: 1 }, passes: { key: 4 } }] }] });
    if (path.endsWith("/fixtures")) return Response.json({ response: [{ fixture: { id: 99, date: "2026-08-16T18:00:00Z", status: { short: "NS" } }, league: { round: "Regular Season - 1" }, teams: { home: { id: 1 }, away: { id: 2 } }, goals: { home: null, away: null } }] });
    throw new Error(`Unexpected URL: ${url}`);
  };
  try {
    const snapshot = await buildRealDataSnapshot(new ApiFootballProvider("test-key", "Segunda División", 0), 2026, true);
    assert.equal(snapshot.players[0].name, "Jugador API");
    assert.equal(snapshot.players[0].minutes, 180);
    assert.equal(snapshot.players[0].shots, 5);
    assert.equal(snapshot.players[0].keyPasses, 4);
    assert.equal(snapshot.fixtures[0].round, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("builds the free public 2026/27 catalog without credentials", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const teamId = new URL(url).searchParams.get("team");
    return new Response(`<table><tr itemprop="employee"><td><div class="bi-position bi-position-1"></div></td><th><a content="/jugador/jugador-${teamId}"><span itemprop="name">Jugador ${teamId}</span></a></th><td class="dat" itemprop="dorsal" content="1">1</td><td class="dat" itemprop="birthDate">24</td><td itemprop="nationality"><span content="ES"></span></td><td class="dat">188</td><td class="dat">80</td><td class="dat">2</td><td class="dat">1</td><td class="dat">3</td></tr></table>`);
  };
  try {
    const snapshot = await buildRealDataSnapshot(new FreePublicProvider(0), 2026, true);
    assert.equal(snapshot.teams.length, 22);
    assert.equal(snapshot.players.length, 22);
    assert.equal(snapshot.fixtures.length, 22);
    assert.equal(snapshot.fixtures[0].round, 1);
    assert.equal(snapshot.players[0].position, "POR");
    assert.equal(snapshot.players[0].age, 24);
    assert.equal(snapshot.players[0].heightCm, 188);
    assert.equal(snapshot.players[0].weightKg, 80);
    assert.equal(snapshot.players[0].goals, 2);
    assert.equal(snapshot.players[0].redCards, 1);
    assert.equal(snapshot.players[0].yellowCards, 3);
    assert.match(snapshot.metadata.provider, /RFEF/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
