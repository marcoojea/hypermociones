import assert from "node:assert/strict";
import test from "node:test";
import { parseRfefPlayerHistory } from "../providers/football/rfef-history.ts";
import { enrichPlayersWithIntelligence } from "../domain/player-intelligence.ts";

const html = `<table><tbody><tr><td>Segunda División</td><td>40</td><td>4</td><td>1</td><td>5</td><td>8</td><td>1</td><td>3150</td></tr><tr><td>Copa del Rey</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>90</td></tr></tbody></table>`;

test("parses public RFEF historical columns and derives starts", () => {
  assert.deepEqual(parseRfefPlayerHistory(html), { competition: "Segunda División", appearances: 40, substituteAppearances: 4, starts: 36, goals: 1, assists: 5, yellowCards: 8, redCards: 1, minutes: 3150 });
});

test("enriches a catalog player without replacing current-season metrics", () => {
  const player = { id: "p1", name: "Jugador", position: "MED", appearances: null, team: { id: "t1" } };
  const open = { metadata: null, players: [{ playerId: "p1", marketValue: { amountEur: 2_000_000, valuedAt: "2026-06-01", source: "Open", sourceUrl: "https://example.com" }, previousSeason: null }] };
  const rfef = { metadata: null, players: [{ playerId: "p1", sourcePlayerId: "1", teamId: "t1", competition: "Segunda División", season: "2025/26", appearances: 40, substituteAppearances: 4, starts: 36, minutes: 3150, goals: 1, assists: 5, yellowCards: 8, redCards: 1, sourceUrl: "https://rfef.es" }] };
  const enriched = enrichPlayersWithIntelligence([player], open, rfef)[0];
  assert.equal(enriched.appearances, null);
  assert.equal(enriched.previousSeason.starts, 36);
  assert.equal(enriched.previousSeason.relevanceScore > 80, true);
  assert.equal(enriched.marketValue.amountEur, 2_000_000);
});
