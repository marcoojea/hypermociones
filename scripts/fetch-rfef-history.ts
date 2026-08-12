import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import snapshotJson from "../data/generated/real-data.json";
import type { RfefHistoricalPlayer, RfefHistorySnapshot } from "../data/rfef-history-types";
import type { PlayerListItem } from "../domain/player";
import { parseRfefPlayerHistory } from "../providers/football/rfef-history";

const CACHE_DIR = path.resolve("work/rfef-history");
const OUTPUT_PATH = path.resolve("data/generated/rfef-history.json");
const WIDGET_URL = "https://widgets.besoccerapps.com/scripts/widgets";
const SEASON = "2026";
const refresh = process.argv.includes("--refresh");
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const playerSourceUrl = (playerId: string, teamId: string) => `${WIDGET_URL}?${new URLSearchParams({ type: "player_info_ajax", id: playerId, team: teamId, season: SEASON, style: "rfef", lang: "es" })}`;

async function requestCached(cacheName: string, parameters: Record<string, string>, optional = false) {
  const destination = path.join(CACHE_DIR, cacheName);
  if (!refresh && existsSync(destination)) return readFile(destination, "utf8");
  const response = await fetch(`${WIDGET_URL}?${new URLSearchParams({ ...parameters, style: "rfef", lang: "es" })}`, { headers: { Accept: "text/html", "User-Agent": "Hypermociones/0.1 (histórico público RFEF; caché local)" } });
  if (!response.ok) {
    if (optional && [400, 404].includes(response.status)) return null;
    throw new Error(`El histórico RFEF respondió HTTP ${response.status}.`);
  }
  const html = await response.text();
  await writeFile(destination, html, "utf8");
  await wait(350);
  return html;
}

await mkdir(CACHE_DIR, { recursive: true });
const catalogPlayers = snapshotJson.players as PlayerListItem[];
const historical: RfefHistoricalPlayer[] = [];
let cursor = 0;
async function worker() {
  while (cursor < catalogPlayers.length) {
    const current = catalogPlayers[cursor];
    cursor += 1;
    const sourceTeamId = current.team.id.replace(/^fd-team-/, "");
    const sourcePlayerId = current.id.replace(/^fd-player-/, "");
    const profileHtml = await requestCached(`player-${sourcePlayerId}-${sourceTeamId}-${SEASON}.html`, { type: "player_info_ajax", id: sourcePlayerId, team: sourceTeamId, season: SEASON }, true);
    if (profileHtml) {
      const stats = parseRfefPlayerHistory(profileHtml);
      if (stats) historical.push({ playerId: current.id, sourcePlayerId, teamId: current.team.id, season: "2025/26", sourceUrl: playerSourceUrl(sourcePlayerId, sourceTeamId), ...stats });
    }
    if (cursor % 50 === 0) console.log(`${cursor}/${catalogPlayers.length} fichas procesadas · ${historical.length} con histórico`);
  }
}
await Promise.all([worker(), worker(), worker()]);

const result: RfefHistorySnapshot = { metadata: { provider: "RFEF / widget público de competición", importedAt: new Date().toISOString(), season: "2025/26", matchedPlayers: historical.length, catalogPlayers: catalogPlayers.length,
  note: "Las titularidades se derivan como PJ menos apariciones como suplente (columna S de la ficha pública). Solo se usa el identificador estable de cada jugador del catálogo actual." }, players: historical.sort((a, b) => a.playerId.localeCompare(b.playerId)) };
await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Histórico RFEF generado: ${historical.length}/${catalogPlayers.length} jugadores actuales con métricas 2025/26.`);
