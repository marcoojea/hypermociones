import { getDataStatus } from "../repositories/data-status-repository";

const status = getDataStatus();
const failures: string[] = [];

if (status.mode !== "REAL") failures.push("el catálogo no está en modo real");
if (status.teams !== 22) failures.push(`se esperaban 22 equipos y hay ${status.teams}`);
if (status.players < 300) failures.push(`solo hay ${status.players} jugadores`);
if (status.fixtures === 0) failures.push("no hay partidos importados");
if (["STALE", "UNKNOWN"].includes(status.freshness.level)) failures.push(status.freshness.label);

if (failures.length) {
  throw new Error(`Control de datos fallido: ${failures.join("; ")}. Ejecuta npm.cmd run data:fetch antes de publicar.`);
}

console.log(`Datos aptos para release: ${status.teams} equipos, ${status.players} jugadores, ${status.fixtures} partidos · ${status.freshness.label}.`);
