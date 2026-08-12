import { createWriteStream, existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import snapshotJson from "../data/generated/real-data.json";
import type { PlayerIntelligenceEntry, PlayerIntelligenceSnapshot } from "../data/player-intelligence-types";
import type { PlayerListItem, Position } from "../domain/player";
import { normalizeFootballName, OPEN_DATA_BASE_URL, OPEN_DATA_LICENSE, OPEN_DATA_PROJECT_URL, readGzipCsv, tokenSimilarity } from "../providers/football/transfermarkt-open-data";

const CACHE_DIR = path.resolve("work/player-intelligence");
const OUTPUT_PATH = path.resolve("data/generated/player-intelligence.json");
const FILES = ["players", "player_valuations"] as const;
const DATASET_UPDATED_AT = "2026-08-05";
const refresh = process.argv.includes("--refresh");

type SourcePlayer = {
  id: string;
  name: string;
  currentClubName: string;
  position: string;
  profileUrl: string;
  birthYear: number | null;
  lastSeason: number;
};

const numberOrNull = (value: string | undefined) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) ? parsed : null;
};

async function download(name: typeof FILES[number]) {
  const destination = path.join(CACHE_DIR, `${name}.csv.gz`);
  if (!refresh && existsSync(destination)) return destination;
  const temporary = `${destination}.download`;
  const response = await fetch(`${OPEN_DATA_BASE_URL}/${name}.csv.gz`, { headers: { "User-Agent": "Hypermociones/0.1 (open-data ingestion)" } });
  if (!response.ok || !response.body) throw new Error(`No se pudo descargar ${name}: HTTP ${response.status}`);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(temporary);
    Readable.fromWeb(response.body as never).pipe(output).on("finish", resolve).on("error", reject);
  });
  await rename(temporary, destination);
  return destination;
}

function clubCompatible(catalogClub: string, sourceClub: string) {
  const left = normalizeFootballName(catalogClub);
  const right = normalizeFootballName(sourceClub);
  return left === right || left.includes(right) || right.includes(left) || tokenSimilarity(left, right) >= .55;
}

function nameScore(catalogName: string, sourceName: string) {
  const left = normalizeFootballName(catalogName);
  const right = normalizeFootballName(sourceName);
  if (left === right) return 1;
  if (left.length >= 5 && right.length >= 5 && (left.includes(right) || right.includes(left))) return .9;
  return tokenSimilarity(left, right);
}

function sourcePosition(value: string): Position {
  return value === "Goalkeeper" ? "POR" : value === "Defender" ? "DEF" : value === "Midfield" ? "MED" : "DEL";
}

function matchPlayer(catalogPlayer: PlayerListItem, candidates: readonly SourcePlayer[]) {
  const expectedBirthYear = catalogPlayer.age === null ? null : 2026 - catalogPlayer.age;
  const scored = candidates.map((source) => {
    const score = nameScore(catalogPlayer.name, source.name);
    const club = clubCompatible(catalogPlayer.team.name, source.currentClubName);
    const position = sourcePosition(source.position) === catalogPlayer.position;
    const ageDistance = expectedBirthYear === null || source.birthYear === null ? null : Math.abs(expectedBirthYear - source.birthYear);
    return { source, score, club, position, ageDistance, rank: score * 10 + Number(club) * 1.5 + Number(position) + (ageDistance !== null && ageDistance <= 1 ? 1 : 0) + Math.min(source.lastSeason, 2026) / 10_000 };
  }).filter((candidate) => candidate.score >= .55 && candidate.position && (candidate.score >= .9 || candidate.club || (candidate.ageDistance !== null && candidate.ageDistance <= 1)))
    .sort((a, b) => b.rank - a.rank || Number(b.source.id) - Number(a.source.id));
  const best = scored[0];
  if (!best) return null;
  const runnerUp = scored[1];
  if (runnerUp && best.rank - runnerUp.rank < .05) return null;
  const exact = normalizeFootballName(catalogPlayer.name) === normalizeFootballName(best.source.name);
  if (!exact && !best.club) return null;
  return { source: best.source, method: exact ? "EXACT" as const : "CLUB_ASSISTED" as const };
}

await mkdir(CACHE_DIR, { recursive: true });
const [playersPath, valuationsPath] = await Promise.all(FILES.map(download));
const sourcePlayers: SourcePlayer[] = [];
await readGzipCsv(playersPath, (row) => {
  sourcePlayers.push({ id: row.player_id, name: row.name, currentClubName: row.current_club_name, position: row.position, profileUrl: row.url,
    birthYear: numberOrNull(row.date_of_birth?.slice(0, 4)), lastSeason: Number(row.last_season) || 0 });
});

const catalogPlayers = snapshotJson.players as PlayerListItem[];
const sourceByName = new Map<string, SourcePlayer[]>();
const sourceByToken = new Map<string, SourcePlayer[]>();
for (const source of sourcePlayers) {
  const normalized = normalizeFootballName(source.name);
  sourceByName.set(normalized, [...(sourceByName.get(normalized) ?? []), source]);
  for (const token of new Set(normalized.split(" ").filter(Boolean))) sourceByToken.set(token, [...(sourceByToken.get(token) ?? []), source]);
}
const matched = catalogPlayers.flatMap((catalogPlayer) => {
  const normalized = normalizeFootballName(catalogPlayer.name);
  const exactCandidates = sourceByName.get(normalized) ?? [];
  const tokenCandidates = [...new Map(normalized.split(" ").flatMap((token) => sourceByToken.get(token) ?? []).map((source) => [source.id, source])).values()];
  const result = matchPlayer(catalogPlayer, exactCandidates.length ? exactCandidates : tokenCandidates);
  return result ? [{ catalogPlayer, ...result }] : [];
});
const wantedIds = new Set(matched.map((entry) => entry.source.id));
const latestValuation = new Map<string, { amount: number; date: string }>();
await readGzipCsv(valuationsPath, (row) => {
  if (!wantedIds.has(row.player_id) || row.date > DATASET_UPDATED_AT) return;
  const amount = numberOrNull(row.market_value_in_eur);
  const current = latestValuation.get(row.player_id);
  if (amount !== null && (!current || row.date > current.date)) latestValuation.set(row.player_id, { amount, date: row.date });
});

const entries: PlayerIntelligenceEntry[] = matched.map(({ catalogPlayer, source, method }) => {
  const valuation = latestValuation.get(source.id);
  return { playerId: catalogPlayer.id, sourcePlayerId: source.id, sourcePlayerName: source.name, matchMethod: method,
    marketValue: valuation ? { amountEur: valuation.amount, valuedAt: valuation.date, source: "Transfermarkt open dataset", sourceUrl: source.profileUrl } : null,
    previousSeason: null };
});

const result: PlayerIntelligenceSnapshot = {
  metadata: { provider: "Transfermarkt open dataset (dcaribou)", sourceUrl: OPEN_DATA_PROJECT_URL, license: OPEN_DATA_LICENSE, datasetUpdatedAt: DATASET_UPDATED_AT,
    generatedAt: new Date().toISOString(), performanceSeason: "2025/26", methodVersion: "strict-market-link-v2", matchedPlayers: entries.length,
    playersWithPerformance: 0, playersWithMarketValue: entries.filter((entry) => entry.marketValue).length, catalogPlayers: catalogPlayers.length,
    note: "El valor es una estimación publicada por la fuente, no un precio de Fantasy. Se conserva la fecha real de la última valoración y se aceptan solo nombres exactos o coincidencias asistidas por club, posición y edad." },
  players: entries.sort((a, b) => a.playerId.localeCompare(b.playerId)),
};
await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Mercado generado: ${result.metadata?.matchedPlayers}/${catalogPlayers.length} enlazados y ${result.metadata?.playersWithMarketValue} con valor fechado.`);
