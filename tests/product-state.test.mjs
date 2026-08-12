import assert from "node:assert/strict";
import test from "node:test";
import { appendLineupRevision, lineupChanges, parseLineupHistory } from "../domain/lineup-history.ts";
import { emptyLineup } from "../domain/lineup.ts";
import { emptyPlanner, isPlannerState } from "../domain/planner.ts";
import { emptyWatchlist, isWatchlistState } from "../domain/watchlist.ts";
import { emptyMarket, isMarketState } from "../domain/market.ts";

test("keeps a bounded lineup revision history and detects confidence changes", () => {
  const first = emptyLineup("t1", 1); first.starters[0] = { ...first.starters[0], playerId: "p1", confidence: 50 };
  const second = structuredClone(first); second.starters[0].confidence = 80;
  let history = parseLineupHistory(null, "t1", 1); history = appendLineupRevision(history, first); history = appendLineupRevision(history, second);
  assert.equal(history.revisions.length, 2);
  assert.deepEqual(lineupChanges(first, second), [{ playerId: "p1", type: "UP", from: 50, to: 80 }]);
});

test("validates local watchlist, planner and market formats", () => {
  assert.equal(isWatchlistState({ ...emptyWatchlist(), playerIds: ["p1", "p2"] }), true);
  assert.equal(isWatchlistState({ ...emptyWatchlist(), playerIds: ["p1", "p1"] }), false);
  assert.equal(isPlannerState(emptyPlanner()), true);
  assert.equal(isPlannerState({ ...emptyPlanner(), horizon: 9 }), false);
  assert.equal(isMarketState({ ...emptyMarket(), entries: [{ playerId: "p1", value: 1_000_000, change1d: 20_000, change7d: null, updatedAt: new Date().toISOString() }] }), true);
  assert.equal(isMarketState({ ...emptyMarket(), entries: [{ playerId: "p1", value: -1, change1d: null, change7d: null, updatedAt: "x" }] }), false);
});
