import assert from "node:assert/strict";
import test from "node:test";

import { isLiveFeed } from "../domain/live.ts";
import { buildVerifiedResultsFallback } from "../data/live-fallback.ts";
import { ApiFootballLiveProvider, isLiveProviderAccessError } from "../providers/football/api-football-live.ts";

test("maps live scores, events and player metrics without calculating Fantasy points", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = String(url);
    if (path.includes("/leagues?")) return Response.json({ errors: [], response: [{ league: { id: 141, name: "Segunda División" }, seasons: [{ year: 2026, coverage: { fixtures: { events: true, statistics_fixtures: true, statistics_players: true } } }] }] });
    if (path.includes("/fixtures/statistics")) return Response.json({ errors: [], response: [{ team: { id: 1, name: "Local", logo: null }, statistics: [{ type: "Ball Possession", value: "55%" }, { type: "Total Shots", value: 8 }, { type: "Shots on Goal", value: 3 }, { type: "Corner Kicks", value: 4 }, { type: "Fouls", value: 7 }, { type: "Goalkeeper Saves", value: 2 }] }] });
    if (path.includes("/fixtures/players")) return Response.json({ errors: [], response: [{ team: { id: 1, name: "Local", logo: null }, players: [{ player: { id: 10, name: "Jugador Uno" }, statistics: [{ games: { minutes: 35, rating: "7.4", substitute: false }, shots: { total: 2, on: 1 }, goals: { total: 1, assists: 0, saves: null }, passes: { key: 2 }, tackles: { total: 1, interceptions: 0 }, cards: { yellow: 0, red: 0 } }] }] }] });
    if (path.includes("/fixtures?")) return Response.json({ errors: [], response: [{ fixture: { id: 99, date: "2026-08-18T20:00:00+02:00", status: { short: "1H", elapsed: 35 } }, teams: { home: { id: 1, name: "Local", logo: null }, away: { id: 2, name: "Visitante", logo: null } }, goals: { home: 1, away: 0 }, events: [{ time: { elapsed: 20, extra: null }, team: { id: 1, name: "Local", logo: null }, player: { id: 10, name: "Jugador Uno" }, assist: { id: 11, name: "Jugador Dos" }, type: "Goal", detail: "Normal Goal" }] }] });
    throw new Error(`Unexpected URL ${path}`);
  };
  try {
    const feed = await new ApiFootballLiveProvider("test", 0).getFeed(2026, new Date("2026-08-18T18:35:00Z"));
    assert.equal(isLiveFeed(feed), true);
    assert.equal(feed.status, "LIVE");
    assert.equal(feed.capabilities.fantasyPoints, false);
    assert.equal(feed.matches[0].events[0].type, "GOAL");
    assert.equal(feed.matches[0].playerStats[0].rating, 7.4);
    assert.equal(feed.matches[0].teamStats[0].possession, 55);
  } finally { globalThis.fetch = originalFetch; }
});

test("reports provider plan restrictions as an access error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ errors: { plan: "Free plans do not have access to this season" }, response: [] });
  try {
    await assert.rejects(() => new ApiFootballLiveProvider("test", 0).getFeed(2026), (error) => isLiveProviderAccessError(error));
  } finally { globalThis.fetch = originalFetch; }
});

test("falls back to verified results and team statistics without inventing player metrics", () => {
  const feed = buildVerifiedResultsFallback("Proveedor no disponible.");
  assert.equal(feed.status, "RECENT");
  assert.equal(feed.matches.length, 11);
  assert.equal(feed.matches.every((match) => match.status === "FINISHED"), true);
  assert.equal(feed.matches.every((match) => match.events.length === 0 && match.playerStats.length === 0), true);
  assert.equal(feed.matches.every((match) => match.teamStats.length === 2), true);
  assert.equal(feed.matches[1].teamStats[0].possession, 62.9);
  assert.equal(feed.matches[1].teamStats[1].shots, 5);
  assert.equal(feed.capabilities.scores, true);
  assert.equal(feed.capabilities.teamStats, true);
  assert.equal(feed.capabilities.playerStats, false);
  assert.match(feed.sourceUrl ?? "", /laliga\.com/);
});
