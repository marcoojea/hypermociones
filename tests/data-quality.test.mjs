import assert from "node:assert/strict";
import test from "node:test";
import { buildMetricCoverage, getDataFreshness } from "../domain/data-quality.ts";

test("classifies data freshness without treating future timestamps as stale", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  assert.equal(getDataFreshness("2026-08-11T12:00:00Z", now).level, "FRESH");
  assert.equal(getDataFreshness("2026-08-07T12:00:00Z", now).level, "REVIEW");
  assert.equal(getDataFreshness("2026-08-01T12:00:00Z", now).level, "STALE");
  assert.equal(getDataFreshness("2026-08-13T12:00:00Z", now).ageDays, 0);
  assert.equal(getDataFreshness(null, now).level, "UNKNOWN");
});

test("reports null metrics as missing rather than zero", () => {
  const base = { age: 24, shirtNumber: 7, appearances: 0, minutes: 0, goals: 0, assists: null, yellowCards: 0, redCards: 0, fis: null };
  const coverage = buildMetricCoverage([base, { ...base, age: null, goals: null, assists: 2, fis: 80 }]);
  assert.deepEqual(coverage.find((metric) => metric.key === "goals"), { key: "goals", label: "Goles", available: 1, total: 2, percentage: 50 });
  assert.equal(coverage.find((metric) => metric.key === "minutes")?.percentage, 100);
  assert.equal(coverage.find((metric) => metric.key === "fis")?.percentage, 50);
});
