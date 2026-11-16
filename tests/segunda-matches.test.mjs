import assert from "node:assert/strict";
import test from "node:test";
import { assertCompleteRound, assertNoDuplicateEvents, activeRoundNumber, nextRoundNumber, normalizeTeamName, parseEventsResponse, toMatchStatus, toSnapshotFixtures } from "../domain/segunda-matches.ts";

const team = (id, name) => ({ id, name, shortName: name.slice(0, 3).toUpperCase(), slug: id, primaryColor: "#ffffff", crestUrl: null });
const TEAMS = [team("t-leg", "CD Leganés"), team("t-ovi", "Real Oviedo"), team("t-rsb", "Real Sociedad de Fútbol B")];
const sdbMatch = (overrides = {}) => ({ eventId: "9", round: 13, date: "2026-11-20", time: "19:30:00", kickoffAt: "2026-11-20T19:30:00Z", status: "SCHEDULED", rawStatus: "NS", home: "Leganés", away: "Real Oviedo", homeGoals: null, awayGoals: null, ...overrides });

const event = (overrides = {}) => ({
  idEvent: "1",
  intRound: "13",
  dateEvent: "2026-11-14",
  strTime: "18:30:00",
  strStatus: "FT",
  strHomeTeam: "Real Oviedo",
  strAwayTeam: "Granada",
  intHomeScore: "2",
  intAwayScore: "1",
  ...overrides,
});

test("toMatchStatus maps finished, postponed and scheduled states", () => {
  assert.equal(toMatchStatus("FT"), "FINISHED");
  assert.equal(toMatchStatus("PST"), "POSTPONED");
  assert.equal(toMatchStatus("NS"), "SCHEDULED");
  assert.equal(toMatchStatus(null), "SCHEDULED");
  assert.equal(toMatchStatus("1H"), "OTHER");
});

test("parseEventsResponse returns [] when the round has no events", () => {
  assert.deepEqual(parseEventsResponse({ events: null }), []);
});

test("parseEventsResponse reads a finished match with integer goals and round", () => {
  const [match] = parseEventsResponse({ events: [event()] });
  assert.equal(match.status, "FINISHED");
  assert.equal(match.round, 13);
  assert.equal(match.homeGoals, 2);
  assert.equal(match.awayGoals, 1);
});

test("a finished status without both scores is not a result", () => {
  const [match] = parseEventsResponse({ events: [event({ intHomeScore: null })] });
  assert.equal(match.status, "OTHER");
  assert.equal(match.homeGoals, null);
});

test("a postponed match keeps null goals, never zero", () => {
  const [match] = parseEventsResponse({ events: [event({ strStatus: "PST", intHomeScore: null, intAwayScore: null })] });
  assert.equal(match.status, "POSTPONED");
  assert.equal(match.homeGoals, null);
  assert.equal(match.awayGoals, null);
});

test("parseEventsResponse throws on an unexpected shape instead of guessing", () => {
  assert.throws(() => parseEventsResponse({ notEvents: [] }));
});

test("normalizeTeamName ignores club prefixes, suffixes and accents", () => {
  assert.equal(normalizeTeamName("Real Sociedad de Fútbol B"), normalizeTeamName("Real Sociedad B"));
  assert.equal(normalizeTeamName("CD Leganés"), normalizeTeamName("Leganés"));
  assert.equal(normalizeTeamName("Real Sporting de Gijón"), normalizeTeamName("Sporting Gijón"));
});

test("toSnapshotFixtures maps matches onto snapshot teams with UTC kickoff", () => {
  const { fixtures, unmatched } = toSnapshotFixtures([sdbMatch()], TEAMS);
  assert.deepEqual(unmatched, []);
  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].homeTeam.id, "t-leg");
  assert.equal(fixtures[0].awayTeam.id, "t-ovi");
  assert.equal(fixtures[0].kickoffAt, "2026-11-20T19:30:00Z");
  assert.equal(fixtures[0].externalId, "thesportsdb-9");
  assert.equal(fixtures[0].homeScore, null);
});

test("toSnapshotFixtures reports unknown team names instead of dropping the match", () => {
  const { fixtures, unmatched } = toSnapshotFixtures([sdbMatch({ home: "Equipo Inventado" })], TEAMS);
  assert.deepEqual(fixtures, []);
  assert.deepEqual(unmatched, ["Equipo Inventado"]);
});

test("toSnapshotFixtures keeps unknown live states as TIMED without scores", () => {
  const { fixtures } = toSnapshotFixtures([sdbMatch({ status: "OTHER", homeGoals: null, awayGoals: null })], TEAMS);
  assert.equal(fixtures[0].status, "TIMED");
  assert.equal(fixtures[0].homeScore, null);
});

test("nextRoundNumber picks the round of the earliest scheduled fixture", () => {
  const fixtures = [
    { status: "FINISHED", kickoffAt: "2026-11-13T18:00:00Z", round: 14 },
    { status: "POSTPONED", kickoffAt: "2026-11-06T19:30:00Z", round: 13 },
    { status: "SCHEDULED", kickoffAt: "2026-11-21T19:30:00Z", round: 15 },
    { status: "SCHEDULED", kickoffAt: "2026-11-20T19:30:00Z", round: 15 },
  ];
  assert.equal(nextRoundNumber(fixtures), 15);
  assert.equal(nextRoundNumber([{ status: "FINISHED", kickoffAt: "2026-11-13T18:00:00Z", round: 14 }]), null);
});

test("parseEventsResponse rejects a score that is present but not a whole number", () => {
  assert.throws(() => parseEventsResponse({ events: [event({ intHomeScore: "abc" })] }), /marcador no válido/);
  assert.throws(() => parseEventsResponse({ events: [event({ intAwayScore: "-1" })] }), /marcador no válido/);
});

test("parseEventsResponse rejects an empty or zero round instead of reading it as round 0", () => {
  assert.throws(() => parseEventsResponse({ events: [event({ intRound: "" })] }), /jornada no válida/);
  assert.throws(() => parseEventsResponse({ events: [event({ intRound: "0" })] }), /jornada no válida/);
});

test("'Match Finished' with both scores counts as a result", () => {
  const [match] = parseEventsResponse({ events: [event({ strStatus: "Match Finished" })] });
  assert.equal(match.status, "FINISHED");
});

test("a timestamp that already has an offset marker is not given a second Z", () => {
  const [match] = parseEventsResponse({ events: [event({ strTimestamp: "2026-11-20T19:30:00Z", dateEvent: "2026-11-20", strTime: "19:30:00" })] });
  assert.equal(match.kickoffAt, "2026-11-20T19:30:00Z");
});

test("assertCompleteRound fails when a round has fewer matches than expected", () => {
  const match = (round) => ({ eventId: String(Math.random()), round, status: "FINISHED" });
  assert.throws(() => assertCompleteRound([match(3), match(3)], 3, 11), /se esperaban 11/);
  assert.doesNotThrow(() => assertCompleteRound(Array.from({ length: 11 }, () => match(3)), 3, 11));
});

test("assertNoDuplicateEvents rejects repeated event ids", () => {
  const match = (eventId) => ({ eventId, round: 1 });
  assert.throws(() => assertNoDuplicateEvents([match("7"), match("7")]), /duplicado/);
});

test("a team name made only of generic tokens is reported, not matched on an empty key", () => {
  const { fixtures, unmatched } = toSnapshotFixtures([sdbMatch({ home: "Real Club" })], [...TEAMS, team("t-empty", "Club")]);
  assert.deepEqual(fixtures, []);
  assert.deepEqual(unmatched, ["Real Club"]);
});

test("activeRoundNumber skips a round with one pending match and picks the first mostly-scheduled round", () => {
  const fixture = (round, status) => ({ round, status });
  const fixtures = [
    ...Array.from({ length: 10 }, () => fixture(14, "FINISHED")),
    fixture(14, "SCHEDULED"),
    ...Array.from({ length: 11 }, () => fixture(15, "SCHEDULED")),
  ];
  assert.equal(activeRoundNumber(fixtures), 15);
  assert.equal(activeRoundNumber([fixture(1, "FINISHED")]), null);
});
