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
  assert.equal(available.tier, "NR");
  assert.equal(available.recommendationScore, null);
  assert.equal(doubtful.startingProbability, 50);
  assert.match(doubtful.risks.join(" "), /Duda/);
});

test("combines real previous-season participation, impact, relevance and market context", () => {
  const result = recommendPlayer({ player: player({ previousSeason: { season: "2025/26", competitions: ["Segunda División"], clubNames: [], appearances: 38, starts: 32, minutes: 3000, goals: 12, assists: 5, yellowCards: 3, redCards: 0, goalsPer90: .36, assistsPer90: .15, contributionsPer90: .51, appearanceRate: 90, minuteShare: 79, relevanceScore: 82, impactScore: 78, confidence: "HIGH", source: "RFEF", sourceUrl: "https://rfef.es" }, marketValue: { amountEur: 3_000_000, valuedAt: "2026-06-01", positionPercentile: 80, source: "Open data", sourceUrl: "https://example.com" } }) });
  assert.ok((result.startingProbability ?? 0) >= 70);
  assert.ok((result.startingProbability ?? 100) < 100);
  assert.notEqual(result.recommendationScore, null);
  assert.equal(result.source, "MODEL");
  assert.equal(result.impactScore, 78);
  assert.equal(result.marketValueEur, 3_000_000);
});

test("maps tiers at stable boundaries and ranks unrated players last", () => {
  assert.deepEqual([85, 75, 65, 50, 49, null].map(tierFromScore), ["S+", "S", "A", "B", "C", "NR"]);
  assert.deepEqual(rankRecommendations([{ playerId: "a", recommendationScore: null, startingProbability: null }, { playerId: "b", recommendationScore: 70, startingProbability: 80 }]).map((item) => item.playerId), ["b", "a"]);
});
