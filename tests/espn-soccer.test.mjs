import assert from "node:assert/strict";
import test from "node:test";
import { parseScoreboard, parseSummary, probabilityFromLineup, resolveLineupStatuses, samePlayer, splitScoreboard } from "../domain/espn-soccer.ts";

const scoreboardEvent = (overrides = {}) => ({
  id: "401",
  date: "2026-11-16T19:30Z",
  status: { displayClock: "23'", type: { state: "in", completed: false, detail: "23'" } },
  competitions: [{ competitors: [
    { homeAway: "home", score: "1", team: { displayName: "Albacete Balompié" } },
    { homeAway: "away", score: "0", team: { displayName: "RC Celta Fortuna" } },
  ] }],
  ...overrides,
});

const starters = (names) => names.map((displayName) => ({ starter: true, athlete: { displayName } }));
const bench = (names) => names.map((displayName) => ({ starter: false, athlete: { displayName } }));
const XI = ["Juan Pérez", "Luis Gómez", "Ana Ruiz", "Marta Sanz", "Pablo Mora", "Iván Díaz", "Raúl Ortega", "Hugo Vega", "Dani Soler", "Nico Rey", "Alex Bravo"];

test("parseScoreboard reads live state, clock and scores", () => {
  const [match] = parseScoreboard({ events: [scoreboardEvent()] });
  assert.equal(match.state, "in");
  assert.equal(match.clock, "23'");
  assert.equal(match.home.name, "Albacete Balompié");
  assert.equal(match.home.score, 1);
  assert.equal(match.away.score, 0);
});

test("parseScoreboard rejects a score that is not a whole number", () => {
  assert.throws(() => parseScoreboard({ events: [scoreboardEvent({ competitions: [{ competitors: [
    { homeAway: "home", score: "x", team: { displayName: "A" } },
    { homeAway: "away", score: "0", team: { displayName: "B" } },
  ] }] })] }));
});

test("splitScoreboard keeps the good events and reports the bad one", () => {
  const bad = scoreboardEvent({ id: "999", competitions: [{ competitors: [{ homeAway: "home", score: "x", team: { displayName: "A" } }] }] });
  const { matches, errors } = splitScoreboard({ events: [scoreboardEvent(), bad] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].espnId, "401");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /evento 1/);
});

test("parseSummary publishes a side only with exactly 11 starters", () => {
  const full = parseSummary({ rosters: [
    { homeAway: "home", team: { displayName: "Albacete Balompié" }, roster: [...starters(XI), ...bench(["Eva Lara"])] },
    { homeAway: "away", team: { displayName: "RC Celta Fortuna" }, roster: starters(XI.slice(1)) },
  ], keyEvents: [] });
  assert.equal(full.lineups.home.starters.length, 11);
  assert.equal(full.lineups.home.bench[0], "Eva Lara");
  assert.equal(full.lineups.away, null);
});

test("parseSummary reads goal events with their minute", () => {
  const summary = parseSummary({ rosters: [], keyEvents: [{ type: { text: "Goal" }, text: "Juan Pérez goal", scoringPlay: true, clock: { displayValue: "23'" }, team: { displayName: "Albacete Balompié" } }] });
  assert.equal(summary.events[0].minute, "23'");
  assert.equal(summary.events[0].scoring, true);
});

test("samePlayer accepts initial and accent variants and rejects empty names", () => {
  assert.ok(samePlayer("Juan Pérez", "J. Perez"));
  assert.ok(samePlayer("Juan Pérez", "Juan Perez"));
  assert.equal(samePlayer("Juan Pérez", "Luis Pérez"), false);
  assert.equal(samePlayer("", ""), false);
  assert.ok(samePlayer("Antonio Pacheco", "Antonio Pacheco Ruiz"));
  assert.ok(samePlayer("Juanjo Pérez", "Juanjo"));
  assert.equal(samePlayer("Luis Gómez", "Juanjo"), false);
});

test("resolveLineupStatuses marks starters, bench and everyone else as not listed", () => {
  const squad = [...XI, "Eva Lara", "Nadie Real"];
  const lineup = { teamName: "Albacete", starters: [...XI], bench: ["Eva Lara"] };
  const { statuses, unresolved } = resolveLineupStatuses(squad, lineup);
  assert.deepEqual(statuses, [...XI.map(() => "STARTER"), "BENCH", "NOT_LISTED"]);
  assert.deepEqual(unresolved, []);
  assert.deepEqual(resolveLineupStatuses(squad, null).statuses, squad.map(() => null));
});

test("a starter whose name matches nobody makes the whole side unusable, never 0 %", () => {
  const squad = ["Pedro González", "Juan Pérez"];
  const lineup = { teamName: "Canarias", starters: ["Pedri", "Juan Pérez", ...XI.slice(2)], bench: [] };
  const { statuses, unresolved } = resolveLineupStatuses(squad, lineup);
  assert.ok(unresolved.includes("Pedri"));
  assert.deepEqual(statuses, [null, null]);
});

test("an ambiguous loose name is unresolved rather than given to the first candidate", () => {
  const squad = ["Álex García", "Alberto García"];
  const lineup = { teamName: "Equipo", starters: ["A. García", ...XI.slice(1)], bench: [] };
  const { unresolved } = resolveLineupStatuses(squad, lineup);
  assert.ok(unresolved.includes("A. García"));
});

test("an exact name resolves between two players with the same surname and initial", () => {
  const squad = ["Álex García", "Alberto García", ...XI.slice(1)];
  const lineup = { teamName: "Equipo", starters: ["Alberto García", ...XI.slice(1)], bench: ["Álex García"] };
  const { statuses, unresolved } = resolveLineupStatuses(squad, lineup);
  assert.deepEqual(unresolved, []);
  assert.equal(statuses[0], "BENCH");
  assert.equal(statuses[1], "STARTER");
});

test("probabilityFromLineup gives 100 to starters and 0 otherwise", () => {
  assert.equal(probabilityFromLineup("STARTER"), 100);
  assert.equal(probabilityFromLineup("BENCH"), 0);
  assert.equal(probabilityFromLineup("NOT_LISTED"), 0);
});
