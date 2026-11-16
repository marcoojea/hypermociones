import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RealDataSnapshot } from "@/data/real-data-types";
import {
  assertCompleteRound,
  assertNoDuplicateEvents,
  parseEventsResponse,
  toSnapshotFixtures,
  type SegundaMatch,
} from "@/domain/segunda-matches";

const LEAGUE_ID = "4400";
const ROUNDS = 42;
const SEASON = process.env.SEGUNDA_SEASON ?? "2026-2027";
// Public shared key; the free tier is rate-limited, so requests are spaced out.
const API_KEY = process.env.THESPORTSDB_API_KEY ?? "123";
const REQUEST_INTERVAL_MS = Number(process.env.THESPORTSDB_REQUEST_INTERVAL_MS ?? 6000);
const REQUEST_TIMEOUT_MS = 30_000;
const snapshotPath = resolve(process.cwd(), "data/generated/real-data.json");

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function fetchRound(round: number, expected: number): Promise<SegundaMatch[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsround.php?id=${LEAGUE_ID}&r=${round}&s=${SEASON}`;
  let response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  for (let attempt = 1; response.status === 429 && attempt <= 3; attempt += 1) {
    // Shared key: back off instead of failing the whole run on the first limit hit.
    await sleep(60_000 * attempt);
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  }
  const body = await response.text();
  if (!response.ok) throw new Error(`jornada ${round}: HTTP ${response.status}`);
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`jornada ${round}: respuesta no JSON (${body.slice(0, 60)})`);
  }
  let matches: SegundaMatch[];
  try {
    matches = parseEventsResponse(json);
  } catch (error) {
    throw new Error(`jornada ${round}: ${error instanceof Error ? error.message : "respuesta no válida"}`);
  }
  assertCompleteRound(matches, round, expected);
  return matches;
}

async function main() {
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as RealDataSnapshot;
  if (snapshot.teams.length === 0 || snapshot.teams.length % 2 !== 0) throw new Error(`número de equipos no válido: ${snapshot.teams.length}`);
  const matchesPerRound = snapshot.teams.length / 2;

  const matches: SegundaMatch[] = [];
  for (let round = 1; round <= ROUNDS; round += 1) {
    matches.push(...(await fetchRound(round, matchesPerRound)));
    await sleep(REQUEST_INTERVAL_MS);
  }
  assertNoDuplicateEvents(matches);

  const unknownStatuses = [...new Set(matches.filter((match) => match.status === "OTHER").map((match) => match.rawStatus ?? "null"))];
  if (unknownStatuses.length > 0) console.warn(`[fixtures/segunda] estados sin mapear: ${unknownStatuses.join(", ")}`);

  const { fixtures, unmatched } = toSnapshotFixtures(matches, snapshot.teams);
  // Stop before writing: a partial calendar would look complete to the site.
  if (unmatched.length > 0) throw new Error(`nombres sin equipo en el snapshot: ${unmatched.join(", ")}`);

  const next: RealDataSnapshot = {
    ...snapshot,
    fixtures,
    fixturesSource: {
      provider: "TheSportsDB",
      leagueId: LEAGUE_ID,
      season: SEASON,
      fetchedAt: new Date().toISOString(),
      rounds: ROUNDS,
      matches: fixtures.length,
      attribution: "Calendario y resultados de TheSportsDB",
    },
  };
  // Write-then-rename: a crash mid-write must not leave truncated JSON behind.
  const temporary = `${snapshotPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporary, snapshotPath);
  console.log(`Partidos escritos: ${fixtures.length} de ${ROUNDS} jornadas`);
}

main().catch((error: unknown) => {
  console.error(`[fixtures/segunda] ${error instanceof Error ? error.message : "error desconocido"}`);
  process.exitCode = 1;
});
