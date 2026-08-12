import assert from "node:assert/strict";
import test from "node:test";
import { clampConfidence, emptyLineup, formationCodes, formations, lineupStorageKey } from "../domain/lineup.ts";

test("every supported formation defines exactly eleven unique pitch slots", () => {
  for (const code of formationCodes) {
    const slots = formations[code];
    assert.equal(slots.length, 11, code);
    assert.equal(new Set(slots.map((slot) => slot.id)).size, 11, code);
    assert.equal(slots.filter((slot) => slot.position === "POR").length, 1, code);
    assert.ok(slots.every((slot) => slot.x > 0 && slot.x < 100 && slot.y > 0 && slot.y < 100), code);
  }
});

test("creates an empty versioned lineup for a team and round", () => {
  const lineup = emptyLineup("team-1", 3, "4-3-3");
  assert.equal(lineup.teamId, "team-1");
  assert.equal(lineup.round, 3);
  assert.equal(lineup.formation, "4-3-3");
  assert.equal(lineup.starters.length, 11);
  assert.ok(lineup.starters.every((selection) => selection.playerId === null));
  assert.deepEqual(lineup.substitutes, []);
});

test("builds isolated storage keys and clamps confidence values", () => {
  assert.equal(lineupStorageKey("team-1", 2), "hypermociones:lineup:v1:team-1:2");
  assert.equal(clampConfidence(-8), 0);
  assert.equal(clampConfidence(49.6), 50);
  assert.equal(clampConfidence(108), 100);
  assert.equal(clampConfidence(Number.NaN), 0);
});
