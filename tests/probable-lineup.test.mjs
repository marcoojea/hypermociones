import assert from "node:assert/strict";
import test from "node:test";
import { probableXi, probableXiFromEspn } from "../domain/probable-lineup.ts";

const squad = [
  ["p1", "Adrián Vidal", 90], ["p2", "Borja Nieto", 85], ["p3", "Carlos Ibáñez", 80], ["p4", "Diego Marín", 75],
  ["p5", "Eduardo Solís", 70], ["p6", "Fernando Gil", 65], ["p7", "Gonzalo Pardo", 60], ["p8", "Héctor Campos", 55],
  ["p9", "Iván Mora", 50], ["p10", "Jorge Lara", 45], ["p11", "Kevin Peña", 40], ["p12", "Lucas Rivas", 35],
  ["p13", "Mario Ortiz", 30], ["p14", "Nacho Ferrer", 25],
].map(([id, name, historicalProbability]) => ({ id, name, historicalProbability }));

const XI_NAMES = squad.slice(0, 11).map((player) => player.name);
const BENCH_NAMES = ["Lucas Rivas", "Mario Ortiz", "Nacho Ferrer"];
const ids = (players) => players.map((player) => player.playerId);

test("probableXi uses the last XI and bench when every name resolves", () => {
  const result = probableXi({ teamName: "Equipo A", lastXi: XI_NAMES, lastBench: BENCH_NAMES, squad, unavailableNames: [] });
  assert.equal(result.source, "XI_ANTERIOR");
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(ids(result.xi), squad.slice(0, 11).map((player) => player.id));
  assert.ok(result.xi.every((player) => player.reason === "XI_ANTERIOR"));
  assert.deepEqual(ids(result.bench), ["p12", "p13", "p14"]);
  assert.ok(result.bench.every((player) => player.reason === "SUSTITUTO_BANCO"));
});

test("probableXi replaces an unavailable starter with the first bench player", () => {
  // Short ESPN-style name for the unavailable starter must still exclude him.
  const result = probableXi({ teamName: "Equipo A", lastXi: XI_NAMES, lastBench: BENCH_NAMES, squad, unavailableNames: ["C. Ibáñez"] });
  assert.equal(result.source, "XI_ANTERIOR");
  assert.equal(result.xi.length, 11);
  assert.ok(!ids(result.xi).includes("p3"));
  assert.ok(!ids(result.bench).includes("p3"));
  const replacement = result.xi.at(-1);
  assert.equal(replacement.playerId, "p12");
  assert.equal(replacement.reason, "SUSTITUTO_BANCO");
  assert.deepEqual(ids(result.bench), ["p13", "p14"]);
});

test("probableXi falls back to historical probability without an XI", () => {
  const withoutValue = [...squad.slice(0, 13), { id: "p14", name: "Nacho Ferrer", historicalProbability: null }];
  const result = probableXi({ teamName: "Equipo A", lastXi: null, lastBench: [], squad: withoutValue, unavailableNames: ["Adrián Vidal"] });
  assert.equal(result.source, "ESTIMACION_HISTORICA");
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(ids(result.xi), ["p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "p12"]);
  assert.ok(result.xi.every((player) => player.reason === "ESTIMACION_HISTORICA"));
  // A null probability sorts after every known one, so it lands last on the bench.
  assert.deepEqual(ids(result.bench), ["p13", "p14"]);
});

test("probableXi breaks probability ties by name", () => {
  const tied = [
    { id: "a", name: "Zoran Tie", historicalProbability: 50 },
    { id: "b", name: "Abel Tie", historicalProbability: 50 },
  ];
  const result = probableXi({ teamName: "Equipo", lastXi: null, lastBench: [], squad: tied, unavailableNames: [] });
  assert.deepEqual(ids(result.xi), ["b", "a"]);
});

test("probableXi falls back to historical probability when an ESPN name is unresolved", () => {
  const lastXi = [...XI_NAMES.slice(0, 10), "Pedro Desconocido"];
  const result = probableXi({ teamName: "Equipo A", lastXi, lastBench: BENCH_NAMES, squad, unavailableNames: [] });
  assert.equal(result.source, "ESTIMACION_HISTORICA");
  assert.deepEqual(result.unresolved, ["Pedro Desconocido"]);
  assert.deepEqual(ids(result.xi), squad.slice(0, 11).map((player) => player.id));
  assert.ok(result.xi.every((player) => player.reason === "ESTIMACION_HISTORICA"));
});

// ESPN roster with 2026/27 starts and minutes.
const ROSTER = [
  ["p1", "Adrián Vidal", 30, 2700], ["p2", "Borja Nieto", 28, 2500], ["p3", "Carlos Ibáñez", 26, 2300],
  ["p4", "Diego Marín", 24, 2100], ["p5", "Eduardo Solís", 22, 1900], ["p6", "Fernando Gil", 20, 1700],
  ["p7", "Gonzalo Pardo", 18, 1500], ["p8", "Héctor Campos", 16, 1300], ["p9", "Iván Mora", 14, 1100],
  ["p10", "Jorge Lara", 10, 700], ["p11", "Kevin Peña", 10, 900], ["p12", "Lucas Rivas", 8, 500],
  ["p13", "Mario Ortiz", 8, 500], ["p14", "Nacho Ferrer", 4, 100],
].map(([espnId, name, starts, minutes]) => ({ espnId, name, starts, minutes }));

test("probableXiFromEspn uses the last XI and bench when 11 starters are available", () => {
  const result = probableXiFromEspn({ teamName: "Equipo A", lastXi: XI_NAMES, lastBench: BENCH_NAMES, roster: ROSTER, unavailableNames: [] });
  assert.equal(result.source, "XI_ANTERIOR");
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(ids(result.xi), ROSTER.slice(0, 11).map((player) => player.espnId));
  assert.ok(result.xi.every((player) => player.reason === "XI_ANTERIOR"));
  assert.deepEqual(ids(result.bench), ["p12", "p13", "p14"]);
  assert.ok(result.bench.every((player) => player.reason === "SUSTITUTO_BANCO"));
});

test("probableXiFromEspn replaces an unavailable starter with the first bench player", () => {
  const result = probableXiFromEspn({ teamName: "Equipo A", lastXi: XI_NAMES, lastBench: BENCH_NAMES, roster: ROSTER, unavailableNames: ["Carlos Ibáñez"] });
  assert.equal(result.source, "XI_ANTERIOR");
  assert.equal(result.xi.length, 11);
  assert.ok(!ids(result.xi).includes("p3"));
  assert.deepEqual(result.xi.at(-1), { playerId: "p12", name: "Lucas Rivas", reason: "SUSTITUTO_BANCO" });
  assert.deepEqual(ids(result.bench), ["p13", "p14"]);
});

test("probableXiFromEspn ranks by starts then minutes when there is no last XI", () => {
  const result = probableXiFromEspn({ teamName: "Equipo A", lastXi: null, lastBench: [], roster: ROSTER, unavailableNames: [] });
  assert.equal(result.source, "ESTIMACION_HISTORICA");
  assert.deepEqual(result.unresolved, []);
  // Kevin (10 starts, 900 min) ranks ahead of Jorge (10 starts, 700 min).
  assert.deepEqual(ids(result.xi), ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p11", "p10"]);
  assert.ok(result.xi.every((player) => player.reason === "ESTIMACION_HISTORICA"));
  assert.deepEqual(ids(result.bench), ["p12", "p13", "p14"]);
});

test("probableXiFromEspn reports a last-XI name missing from the roster and fills the XI by ranking", () => {
  const lastXi = [...XI_NAMES.slice(0, 10), "Pedro Desconocido"];
  const result = probableXiFromEspn({ teamName: "Equipo A", lastXi, lastBench: BENCH_NAMES, roster: ROSTER, unavailableNames: [] });
  assert.equal(result.source, "ESTIMACION_HISTORICA");
  assert.deepEqual(result.unresolved, ["Pedro Desconocido"]);
  assert.deepEqual(ids(result.xi), ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"]);
  assert.ok(result.xi.every((player) => player.reason === "ESTIMACION_HISTORICA"));
  assert.deepEqual(ids(result.bench), ["p12", "p13", "p14"]);
});

test("probableXiFromEspn ignores accents and case when matching names", () => {
  const lastXi = ["ADRIAN VIDAL", "borja  nieto", "carlos ibanez", "DIEGO MARIN", "Eduardo Solis", "fernando gil",
    "gonzalo pardo", "HECTOR CAMPOS", "ivan mora", "jorge lara", "kevin pena"];
  const result = probableXiFromEspn({ teamName: "Equipo A", lastXi, lastBench: ["LUCAS RIVAS"], roster: ROSTER, unavailableNames: ["BORJA NIETO"] });
  assert.equal(result.source, "XI_ANTERIOR");
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(result.xi.map((player) => player.name), ["Adrián Vidal", "Carlos Ibáñez", "Diego Marín", "Eduardo Solís",
    "Fernando Gil", "Gonzalo Pardo", "Héctor Campos", "Iván Mora", "Jorge Lara", "Kevin Peña", "Lucas Rivas"]);
  assert.deepEqual(ids(result.bench), ["p13", "p14"]);
});
