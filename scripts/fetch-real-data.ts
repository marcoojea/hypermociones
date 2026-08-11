import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildRealDataSnapshot } from "@/providers/football/build-real-data-snapshot";
import { FootballDataOrgProvider } from "@/providers/football/football-data-org";
import { ApiFootballProvider } from "@/providers/football/api-football";
import { FreePublicProvider } from "@/providers/football/free-public";
import type { FootballDataProvider } from "@/providers/football/football-data-provider";
import { persistRealDataSnapshot } from "@/ingestion/persist-real-data";

async function main() {
  const providerName = process.env.DATA_PROVIDER ?? "free-public";
  const seasonStartYear = Number(process.env.FOOTBALL_SEASON ?? process.env.FOOTBALL_DATA_SEASON ?? "2026");
  const defaultIntervalMs = providerName === "free-public" ? "500" : "6500";
  const minimumIntervalMs = Number(process.env.FOOTBALL_REQUEST_INTERVAL_MS ?? process.env.FOOTBALL_DATA_REQUEST_INTERVAL_MS ?? defaultIntervalMs);
  let provider: FootballDataProvider;
  let includePlayerAggregates: boolean;
  if (providerName === "free-public") {
    provider = new FreePublicProvider(minimumIntervalMs);
    includePlayerAggregates = true;
  } else if (providerName === "api-football") {
    const apiKey = process.env.API_FOOTBALL_API_KEY?.trim();
    if (!apiKey || apiKey === "PEGA_AQUI_TU_API_KEY") throw new Error("Falta API_FOOTBALL_API_KEY. Añádelo en .env antes de ejecutar la ingesta.");
    provider = new ApiFootballProvider(apiKey, "Segunda División", minimumIntervalMs);
    includePlayerAggregates = true;
  } else if (providerName === "football-data-org") {
    const token = process.env.FOOTBALL_DATA_API_TOKEN?.trim();
    if (!token || token === "PEGA_AQUI_TU_TOKEN") throw new Error("Falta FOOTBALL_DATA_API_TOKEN. Cópialo en .env antes de ejecutar la ingesta.");
    provider = new FootballDataOrgProvider(token, process.env.FOOTBALL_DATA_COMPETITION ?? "SD", minimumIntervalMs);
    includePlayerAggregates = process.env.FOOTBALL_DATA_INCLUDE_PLAYER_AGGREGATES === "true";
  } else {
    throw new Error(`DATA_PROVIDER desconocido: ${providerName}. Usa free-public, api-football o football-data-org.`);
  }
  const snapshot = await buildRealDataSnapshot(provider, seasonStartYear, includePlayerAggregates);
  const outputDirectory = resolve("data/generated");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "real-data.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  if (process.env.DATABASE_URL) await persistRealDataSnapshot(snapshot, process.env.DATABASE_URL);
  console.log(`Importación completada: ${snapshot.teams.length} equipos, ${snapshot.players.length} jugadores y ${snapshot.fixtures.length} partidos.`);
  if (!process.env.DATABASE_URL) console.log("Snapshot actualizado. DATABASE_URL no estaba configurado, por lo que se omitió PostgreSQL.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `Error de importación: ${error.message}` : "Error de importación desconocido.");
  process.exitCode = 1;
});
