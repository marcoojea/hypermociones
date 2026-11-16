import assert from "node:assert/strict";
import test from "node:test";
import { aggregatePlayers, aggregateTeams, disciplineStatus } from "../domain/segunda-stats.ts";

const player = (overrides = {}) => ({
  teamName: "Equipo A", name: "Juan Pérez", espnId: "1", starter: true, subbedIn: false, subbedOut: false,
  minutes: 90, appearances: 1, goals: 0, assists: 0, yellowCards: 0, redCards: 0, totalShots: 0, shotsOnTarget: 0,
  saves: 0, goalsConceded: 0, ...overrides,
});

const teamStats = (overrides = {}) => ({
  possessionPct: null, totalShots: null, shotsOnTarget: null, foulsCommitted: null, yellowCards: null,
  redCards: null, wonCorners: null, offsides: null, saves: null, ...overrides,
});

const match = (overrides = {}) => ({
  espnId: "1", date: "2026-09-01", state: "post", completed: true,
  home: { name: "Equipo A", score: 1 }, away: { name: "Equipo B", score: 0 }, round: 1,
  lineups: { home: null, away: null }, events: [], teamStats: { home: null, away: null }, players: [], ...overrides,
});

test("aggregatePlayers sums completed matches and matches accent variants of a name", () => {
  const matches = [
    match({ espnId: "1", round: 1, players: [player({ goals: 2, assists: 1, minutes: 90 })] }),
    match({ espnId: "2", round: 2, players: [player({ name: "Juan Perez", goals: 1, assists: 0, minutes: 85, starter: false })] }),
  ];
  const [total] = aggregatePlayers(matches);
  assert.equal(aggregatePlayers(matches).length, 1);
  assert.equal(total.goals, 3);
  assert.equal(total.assists, 1);
  assert.equal(total.appearances, 2);
  assert.equal(total.starts, 1);
  assert.equal(total.minutes, 175);
});

test("aggregatePlayers keeps minutes null when every match is null and sums only the known ones otherwise", () => {
  const matches = [
    match({ espnId: "1", players: [player({ name: "Sin Minutos", minutes: null }), player({ minutes: null })] }),
    match({ espnId: "2", players: [player({ name: "Sin Minutos", minutes: null }), player({ minutes: 30 })] }),
    match({ espnId: "3", players: [player({ minutes: null, name: "Parcial" })] }),
    match({ espnId: "4", players: [player({ name: "Parcial", minutes: 45 })] }),
  ];
  const totals = Object.fromEntries(aggregatePlayers(matches).map((item) => [item.name, item]));
  assert.equal(totals["Sin Minutos"].minutes, null);
  assert.equal(totals["Juan Pérez"].minutes, 30);
  assert.equal(totals.Parcial.minutes, 45);
});

test("aggregatePlayers ignores matches that are not completed and filters by round", () => {
  const matches = [
    match({ espnId: "1", round: 1, players: [player({ goals: 1 })] }),
    match({ espnId: "2", round: 2, players: [player({ goals: 4 })] }),
    match({ espnId: "3", round: 2, completed: false, players: [player({ goals: 9 })] }),
  ];
  assert.equal(aggregatePlayers(matches)[0].goals, 5);
  assert.equal(aggregatePlayers(matches, { round: 2 })[0].goals, 4);
  assert.equal(aggregatePlayers(matches, { round: 3 }).length, 0);
});

test("aggregatePlayers sorts by goals, then assists, then name", () => {
  const matches = [match({ players: [
    player({ name: "Zeta", goals: 1, assists: 0 }),
    player({ name: "Beta", goals: 2, assists: 0 }),
    player({ name: "Alfa", goals: 1, assists: 2 }),
    player({ name: "Gamma", goals: 1, assists: 0 }),
  ] })];
  assert.deepEqual(aggregatePlayers(matches).map((item) => item.name), ["Beta", "Alfa", "Gamma", "Zeta"]);
});

test("aggregateTeams averages possession and sums only known values", () => {
  const matches = [
    match({ espnId: "1", home: { name: "Equipo A", score: 1 }, away: { name: "Equipo B", score: 0 },
      teamStats: { home: teamStats({ possessionPct: 60, totalShots: 10, yellowCards: null }), away: teamStats({ possessionPct: 40 }) } }),
    match({ espnId: "2", home: { name: "Equipo B", score: 0 }, away: { name: "Equipo A", score: 0 },
      teamStats: { home: teamStats({ possessionPct: 50, totalShots: 4, yellowCards: 2 }), away: teamStats({ possessionPct: 40, totalShots: 3 }) } }),
    match({ espnId: "3", home: { name: "Equipo A", score: 0 }, away: { name: "Equipo C", score: 0 }, teamStats: { home: null, away: null } }),
  ];
  const teams = Object.fromEntries(aggregateTeams(matches).map((item) => [item.teamName, item]));
  assert.equal(teams["Equipo A"].played, 3);
  assert.equal(teams["Equipo A"].possessionAvg, 50);
  assert.equal(teams["Equipo A"].totalShots, 13);
  assert.equal(teams["Equipo A"].yellowCards, null);
  assert.equal(teams["Equipo C"].played, 1);
  assert.equal(teams["Equipo C"].possessionAvg, null);
  assert.equal(teams["Equipo C"].totalShots, null);
});

test("disciplineStatus suspends a player with a red card in the latest completed match", () => {
  const matches = [
    match({ espnId: "1", date: "2026-09-01", players: [player({ yellowCards: 1 })] }),
    match({ espnId: "2", date: "2026-09-08", players: [player({ redCards: 1 })] }),
  ];
  assert.deepEqual(disciplineStatus(matches, "Equipo A", "Juan Pérez"), {
    yellowCards: 1, redCardLastMatch: true, suspendedNextMatch: true, reason: "roja en la última jornada",
  });
});

test("disciplineStatus suspends on the fifth yellow only when it came in the latest match", () => {
  const yellowIn = (count) => player({ yellowCards: count });
  const fifthInLatest = [1, 1, 1, 1, 1].map((count, index) => match({
    espnId: String(index + 1), date: `2026-09-0${index + 1}`, players: [yellowIn(count)],
  }));
  assert.deepEqual(disciplineStatus(fifthInLatest, "Equipo A", "Juan Pérez"), {
    yellowCards: 5, redCardLastMatch: false, suspendedNextMatch: true, reason: "5 amarillas acumuladas",
  });

  const fourYellows = fifthInLatest.slice(0, 4);
  assert.deepEqual(disciplineStatus(fourYellows, "Equipo A", "Juan Pérez"), {
    yellowCards: 4, redCardLastMatch: false, suspendedNextMatch: false, reason: null,
  });

  const fifthNotLatest = [
    match({ espnId: "1", date: "2026-09-01", players: [yellowIn(2)] }),
    match({ espnId: "2", date: "2026-09-02", players: [yellowIn(2)] }),
    match({ espnId: "3", date: "2026-09-03", players: [yellowIn(1)] }),
    match({ espnId: "4", date: "2026-09-04", players: [yellowIn(0)] }),
  ];
  assert.equal(disciplineStatus(fifthNotLatest, "Equipo A", "Juan Pérez").suspendedNextMatch, false);
});
