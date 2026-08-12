import assert from "node:assert/strict";
import test from "node:test";
import { backupCategory, createBackup, isHypermocionesStorageKey, parseBackup } from "../domain/local-backup.ts";

test("allows only versioned Hypermociones local storage keys", () => {
  assert.equal(isHypermocionesStorageKey("hypermociones:my-team:v1"), true);
  assert.equal(isHypermocionesStorageKey("hypermociones:availability:v1:2"), true);
  assert.equal(isHypermocionesStorageKey("hypermociones:lineup:v1:team-1:3"), true);
  assert.equal(isHypermocionesStorageKey("other:token"), false);
  assert.equal(isHypermocionesStorageKey("hypermociones:unknown:v1"), false);
});

test("creates a backup without corrupt or foreign entries", () => {
  const backup = createBackup([
    ["hypermociones:my-team:v1", JSON.stringify({ version: 1 })],
    ["hypermociones:availability:v1:1", "invalid"],
    ["secret", JSON.stringify("do-not-export")],
  ], "2026-08-12T12:00:00.000Z");
  assert.deepEqual(Object.keys(backup.entries), ["hypermociones:my-team:v1"]);
  assert.equal(backup.exportedAt, "2026-08-12T12:00:00.000Z");
});

test("rejects malformed backups and preserves valid ones", () => {
  const valid = createBackup([["hypermociones:availability:v1:1", JSON.stringify([])]]);
  assert.deepEqual(parseBackup(valid), valid);
  assert.equal(parseBackup({ ...valid, app: "another-app" }), null);
  assert.equal(parseBackup({ ...valid, entries: { "forbidden:key": "{}" } }), null);
  assert.equal(backupCategory("hypermociones:lineup:v1:club:1"), "Alineaciones");
});
