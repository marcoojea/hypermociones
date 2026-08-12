import assert from "node:assert/strict";
import test from "node:test";
import { rankRecommendations, recommendPlayer, tierFromScore } from "../domain/recommendation.ts";

const player = (overrides = {}) => ({ id: "p1", slug: "p1", name: "Jugador", shirtNumber: 7, nationality: "ES", age: 25, position: "DEL", status: "AVAILABLE", team: { id: "t1", name: "Equipo", shortName: "EQ", slug: "equipo", primaryColor: "#fff" }, appearances: null, starts: null, minutes: null, goals: null, assists: null, xg: null, xa: null, xgi: null, shots: null, keyPasses: null, cleanSheets: null, fantasyPoints: null, pointsPerGame: null, form: null, fis: null, nextOpponent: null, fixtureDifficulty: null, recentMinutes: [], recentPoints: [], strengths: [], risks: [], ...overrides });

test("does not invent a starting probability without editorial or historical signals", () => {
  const result = recommendPlayer({ player: player() });
  assert.equal(result.startingProbability, null);
  assert.equal(result.tier, "NR");
  assert.equal(result.source, "UNRATED");
});

test("uses editorial confidence and explains status penalties", () => {
  const available = recommendPlayer({ player: player(), editorialConfidence: 90 });
  const doubtful = recommendPlayer({ player: player(), editorialConfidence: 90, status: "DOUBTFUL" });
  assert.equal(available.startingProbability, 90);
  assert.equal(available.tier, "S+");
  assert.equal(doubtful.startingProbability, 50);
  assert.match(doubtful.risks.join(" "), /Duda/);
});

test("combines historical starting and minute signals with available performance", () => {
  const result = recommendPlayer({ player: player({ appearances: 10, starts: 8, minutes: 760, recentMinutes: [90, 85, 70], form: 7, fixtureDifficulty: 2 }) });
  assert.ok((result.startingProbability ?? 0) >= 80);
  assert.notEqual(result.recommendationScore, null);
  assert.equal(result.source, "MODEL");
});

test("maps tiers at stable boundaries and ranks unrated players last", () => {
  assert.deepEqual([85, 75, 65, 50, 49, null].map(tierFromScore), ["S+", "S", "A", "B", "C", "NR"]);
  assert.deepEqual(rankRecommendations([{ playerId: "a", recommendationScore: null, startingProbability: null }, { playerId: "b", recommendationScore: 70, startingProbability: 80 }]).map((item) => item.playerId), ["b", "a"]);
});
