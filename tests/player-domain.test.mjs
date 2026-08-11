import assert from "node:assert/strict";
import test from "node:test";
import { seedPlayers } from "../data/seed-players.ts";
import { queryPlayers } from "../domain/player-query.ts";
import { normalizePlayerMatchStats } from "../providers/football/normalize-player-stats.ts";

test("filters players by search, team, position and availability", () => {
  const results = queryPlayers(seedPlayers, { search: "dani", team: "sporting", position: "MED", status: "AVAILABLE" });
  assert.deepEqual(results.map((player) => player.slug), ["dani-rios"]);
});

test("sorts player metrics in either direction without mutating the seed", () => {
  const originalFirst = seedPlayers[0].slug;
  const descending = queryPlayers(seedPlayers, { sort: "fis", direction: "desc" });
  const ascending = queryPlayers(seedPlayers, { sort: "fis", direction: "asc" });
  assert.ok(descending[0].fis >= descending.at(-1).fis);
  assert.ok(ascending[0].fis <= ascending.at(-1).fis);
  assert.equal(seedPlayers[0].slug, originalFirst);
});

test("normalizes valid provider statistics", () => {
  const result = normalizePlayerMatchStats({ fixtureExternalId: "f-1", playerExternalId: "p-1", minutes: 90, started: true, goals: 1, assists: 0, xg: 0.72 });
  assert.equal(result.minutes, 90);
  assert.equal(result.xg, 0.72);
});

test("rejects negative minutes from providers", () => {
  assert.throws(() => normalizePlayerMatchStats({ fixtureExternalId: "f-1", playerExternalId: "p-1", minutes: -1, started: true, goals: 0, assists: 0 }));
});
