import { getDataStatus } from "../repositories/data-status-repository";

const status = getDataStatus();
const failures: string[] = [];

if (status.mode !== "REAL") failures.push("el catálogo no está en modo real");
if (status.teams !== 22) failures.push(`se esperaban 22 equipos y hay ${status.teams}`);
if (status.players < 300) failures.push(`solo hay ${status.players} jugadores`);
if (status.fixtures === 0) failures.push("no hay partidos importados");
if (status.intelligence.historicalPlayers < 500) failures.push(`solo hay ${status.intelligence.historicalPlayers} jugadores con histórico 2025/26`);
if (status.intelligence.marketValues < 200) failures.push(`solo hay ${status.intelligence.marketValues} valores de mercado enlazados`);
if (status.intelligence.currentMarketValues < 100) failures.push(`solo hay ${status.intelligence.currentMarketValues} valores de mercado con menos de un año`);
if (["STALE", "UNKNOWN"].includes(status.freshness.level)) failures.push(status.freshness.label);

if (failures.length) {
  throw new Error(`Control de datos fallido: ${failures.join("; ")}. Ejecuta npm.cmd run data:refresh antes de publicar.`);
}

console.log(`Datos aptos para release: ${status.teams} equipos, ${status.players} jugadores, ${status.fixtures} partidos, ${status.intelligence.historicalPlayers} históricos y ${status.intelligence.currentMarketValues}/${status.intelligence.marketValues} valores vigentes · ${status.freshness.label}.`);
