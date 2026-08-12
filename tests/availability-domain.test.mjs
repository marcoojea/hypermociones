import assert from "node:assert/strict";
import test from "node:test";
import {
  availabilityStorageKey,
  effectivePlayerStatus,
  isAvailabilityRecord,
  isHardUnavailable,
  parseAvailabilityRecords,
} from "../domain/availability.ts";

const record = {
  version: 1,
  playerId: "player-1",
  teamId: "team-1",
  round: 2,
  status: "DOUBTFUL",
  reason: "Molestias",
  expectedReturn: "Pendiente",
  sourceLabel: "Club",
  sourceUrl: "https://example.com/parte",
  confidence: "CONFIRMED",
  updatedAt: "2026-08-12T10:00:00.000Z",
};

test("validates and parses only availability records from the requested round", () => {
  assert.equal(isAvailabilityRecord(record, 2), true);
  assert.equal(isAvailabilityRecord(record, 1), false);
  assert.deepEqual(parseAvailabilityRecords(JSON.stringify([record, { ...record, round: 3 }]), 2), [record]);
  assert.deepEqual(parseAvailabilityRecords("not-json", 2), []);
});

test("overrides provider status without mutating the player", () => {
  const player = { id: "player-1", status: "UNKNOWN" };
  const status = effectivePlayerStatus(player, new Map([[record.playerId, record]]));
  assert.equal(status, "DOUBTFUL");
  assert.equal(player.status, "UNKNOWN");
});

test("distinguishes hard unavailability and isolates storage by round", () => {
  assert.equal(isHardUnavailable("INJURED"), true);
  assert.equal(isHardUnavailable("SUSPENDED"), true);
  assert.equal(isHardUnavailable("DOUBTFUL"), false);
  assert.equal(availabilityStorageKey(4), "hypermociones:availability:v1:4");
});
