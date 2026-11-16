import assert from "node:assert/strict";
import test from "node:test";
import { carryOverEmptyTeams } from "../providers/football/build-real-data-snapshot.ts";

const team = (id, name) => ({ id: `fd-team-${id}`, name, shortName: name, slug: id, primaryColor: "#fff", crestUrl: null });
const player = (id, owner) => ({ id: `fd-player-${id}`, name: `Jugador ${id}`, team: owner, position: "MED" });
const metadata = { provider: "test", competitionCode: "SD", competitionExternalId: "1", seasonExternalId: "2026-27", season: "2026/27", startsOn: "2026-08-16", endsOn: "2027-05-30", importedAt: "2026-11-16T00:00:00.000Z", includesPlayerAggregates: true, unavailableMetrics: [] };
const snapshotWith = (teams, players) => ({ metadata, teams, players, fixtures: [] });

test("carryOverEmptyTeams returns the snapshot untouched when every team has players", () => {
  const north = team("1", "Norte");
  const snapshot = snapshotWith([north], [player("10", north)]);
  assert.equal(carryOverEmptyTeams(snapshot, null), snapshot);
});

test("carryOverEmptyTeams restores an empty team from the previous snapshot and names it", () => {
  const north = team("1", "Norte");
  const south = team("2", "Sur");
  const previous = snapshotWith([north, south], [player("10", north), player("20", south), player("21", south)]);
  const fresh = snapshotWith([north, south], [player("11", north)]);
  const result = carryOverEmptyTeams(fresh, previous);
  assert.deepEqual(result.players.map((item) => item.id).sort(), ["fd-player-11", "fd-player-20", "fd-player-21"]);
  assert.deepEqual(result.metadata.carriedOverTeams, ["Sur"]);
  assert.equal(result.players.find((item) => item.id === "fd-player-20").team, fresh.teams[1]);
});

test("carryOverEmptyTeams fails when an empty team has no previous roster", () => {
  const north = team("1", "Norte");
  const south = team("2", "Sur");
  const fresh = snapshotWith([north, south], [player("11", north)]);
  assert.throws(() => carryOverEmptyTeams(fresh, null), /Sur/);
});
