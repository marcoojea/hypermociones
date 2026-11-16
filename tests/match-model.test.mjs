import assert from "node:assert/strict";
import test from "node:test";
import { buildStandings, estimateStrengths, predictMatch } from "../domain/match-model.ts";

const m = (home, away, homeGoals, awayGoals) => ({ home, away, homeGoals, awayGoals });

test("buildStandings computes points, goal difference and ordering", () => {
  const rows = buildStandings([m("A", "B", 2, 0), m("C", "B", 1, 0), m("A", "C", 1, 1)]);
  assert.deepEqual(rows.map((r) => r.team), ["A", "C", "B"]);
  assert.deepEqual(rows[0], { team: "A", played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 1, goalDifference: 2, points: 4 });
  assert.equal(rows[1].points, 4);
  assert.equal(rows[1].goalDifference, 1);
  assert.equal(rows[2].points, 0);
});

test("buildStandings breaks ties by goals for, then team name", () => {
  const rows = buildStandings([m("Z", "Y", 1, 0), m("B", "X", 3, 2)]);
  assert.deepEqual(rows.map((r) => r.team).slice(0, 2), ["B", "Z"]);
  const names = buildStandings([m("Q", "P", 1, 1)]).map((r) => r.team);
  assert.deepEqual(names, ["P", "Q"]);
});

test("buildStandings returns [] for no matches", () => {
  assert.deepEqual(buildStandings([]), []);
});

test("estimateStrengths returns null for no matches", () => {
  assert.equal(estimateStrengths([]), null);
});

test("estimateStrengths shrinks small samples toward 1", () => {
  const few = [m("Few", "Opp", 4, 0)];
  const many = Array.from({ length: 20 }, () => m("Many", "Opp", 4, 0));
  const s = estimateStrengths([...few, ...many]);
  assert.ok(s.teams.Many.attack > s.teams.Few.attack);
  assert.ok(s.teams.Few.attack > 1);
  assert.ok(s.teams.Many.attack - 1 > s.teams.Few.attack - 1);
});

const strengths = () => estimateStrengths([m("A", "B", 3, 0), m("B", "A", 1, 1), m("A", "C", 2, 1), m("C", "B", 0, 0), m("B", "C", 2, 1), m("C", "A", 0, 2)]);

test("predictMatch returns null for unknown team or null strengths", () => {
  assert.equal(predictMatch(strengths(), "A", "Nope"), null);
  assert.equal(predictMatch(strengths(), "Nope", "A"), null);
  assert.equal(predictMatch(null, "A", "B"), null);
});

test("predictMatch probabilities sum to 1", () => {
  const p = predictMatch(strengths(), "A", "B");
  assert.ok(Math.abs(p.pHome + p.pDraw + p.pAway - 1) < 1e-9);
});

test("predictMatch favours the stronger home attack", () => {
  const p = predictMatch(strengths(), "A", "C");
  assert.ok(p.expectedHomeGoals > p.expectedAwayGoals);
  assert.ok(p.pHome > p.pAway);
});

test("predictMatch gives home advantage to identical teams", () => {
  const s = estimateStrengths([m("X", "Y", 2, 1), m("Y", "X", 2, 1)]);
  const p = predictMatch(s, "X", "Y");
  assert.ok(p.pHome > p.pAway);
});

test("mostLikelyScore is an integer pair within [0, maxGoals]", () => {
  const { mostLikelyScore: s } = predictMatch(strengths(), "A", "B", 4);
  for (const g of [s.home, s.away]) {
    assert.ok(Number.isInteger(g) && g >= 0 && g <= 4);
  }
  assert.ok(s.p > 0 && s.p <= 1);
});

test("a single 0-1 result never gives the home side zero expected goals", () => {
  const s = estimateStrengths([m("H", "A", 0, 1)]);
  const p = predictMatch(s, "H", "A");
  assert.ok(p.expectedHomeGoals > 0);
  assert.ok(p.pHome > 0 && p.pHome < 1);
});
