import assert from "node:assert/strict";
import test from "node:test";
import { emptyFantasyTeam, optimizeFantasyLineup, scoreFantasyPlayer } from "../domain/fantasy-team.ts";

const teamSummary = (id) => ({ id, name: id, shortName: id.toUpperCase(), slug: id, primaryColor: "#fff" });
const player = (id, position, club, overrides = {}) => ({
  id, slug: id, name: id, shirtNumber: null, nationality: "ES", age: 24, position, status: "AVAILABLE", team: teamSummary(club),
  appearances: null, starts: null, minutes: null, goals: null, assists: null, xg: null, xa: null, xgi: null, shots: null, keyPasses: null, cleanSheets: null,
  fantasyPoints: null, pointsPerGame: null, form: null, fis: null, nextOpponent: null, fixtureDifficulty: null, recentMinutes: [], recentPoints: [], strengths: [], risks: [], ...overrides,
});
const entries = (players) => players.map((item, index) => ({ playerId: item.id, purchasePrice: null, projectedPoints: 10 - index / 10, startingChance: 90 }));

test("scores only available signals and applies availability risk", () => {
  const item = player("p1", "DEL", "a", { fis: 80, form: 6 });
  const entry = { playerId: item.id, purchasePrice: null, projectedPoints: null, startingChance: 100 };
  const available = scoreFantasyPlayer(item, entry, "AVAILABLE");
  const doubtful = scoreFantasyPlayer(item, entry, "DOUBTFUL");
  assert.equal(available.dataSignals, 2);
  assert.ok(available.score > doubtful.score);
  assert.match(doubtful.risks.join(" "), /duda/i);
});

test("builds a valid eleven for the chosen formation and excludes hard unavailability", () => {
  const players = [player("gk1", "POR", "a"), player("gk2", "POR", "b"),
    ...Array.from({ length: 5 }, (_, i) => player(`d${i}`, "DEF", `c${i}`)),
    ...Array.from({ length: 5 }, (_, i) => player(`m${i}`, "MED", `m${i}`)),
    ...Array.from({ length: 4 }, (_, i) => player(`f${i}`, "DEL", `f${i}`))];
  const team = { ...emptyFantasyTeam(1), formation: "4-3-3", squad: entries(players) };
  const result = optimizeFantasyLineup({ team, players, statuses: new Map([["f0", "INJURED"]]) });
  assert.equal(result.starters.length, 11);
  assert.equal(result.lineup.starters.filter((slot) => slot.playerId).length, 11);
  assert.equal(result.starters.some((item) => item.playerId === "f0"), false);
  assert.equal(result.captainId, "gk1");
});

test("reports an incomplete squad instead of fabricating a projection", () => {
  const players = [player("gk", "POR", "a"), player("d", "DEF", "b")];
  const team = { ...emptyFantasyTeam(1), squad: entries(players) };
  const result = optimizeFantasyLineup({ team, players });
  assert.equal(result.totalProjectedPoints, null);
  assert.match(result.warnings.join(" "), /Faltan/);
});

test("respects the configurable maximum number of starters per club", () => {
  const players = [player("gk", "POR", "a"),
    ...Array.from({ length: 4 }, (_, i) => player(`da${i}`, "DEF", "a")), ...Array.from({ length: 4 }, (_, i) => player(`db${i}`, "DEF", `b${i}`)),
    ...Array.from({ length: 5 }, (_, i) => player(`m${i}`, "MED", `m${i}`)), ...Array.from({ length: 4 }, (_, i) => player(`f${i}`, "DEL", `f${i}`))];
  const team = { ...emptyFantasyTeam(1), formation: "4-3-3", rules: { ...emptyFantasyTeam().rules, maxPlayersPerClub: 2 }, squad: entries(players) };
  const result = optimizeFantasyLineup({ team, players });
  const clubA = result.starters.filter((item) => players.find((candidate) => candidate.id === item.playerId)?.team.id === "a");
  assert.ok(clubA.length <= 2);
});
