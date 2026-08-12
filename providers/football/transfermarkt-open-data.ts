import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

export const OPEN_DATA_BASE_URL = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data";
export const OPEN_DATA_PROJECT_URL = "https://github.com/dcaribou/transfermarkt-datasets";
export const OPEN_DATA_LICENSE = "CC0-1.0";

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value);
  return values;
}

export async function readGzipCsv(path: string, onRow: (row: Record<string, string>) => void | Promise<void>) {
  const input = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  let headers: string[] | null = null;
  for await (const line of lines) {
    if (!headers) { headers = parseCsvLine(line).map((header) => header.replace(/^\uFEFF/, "")); continue; }
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const result = onRow(row);
    if (result instanceof Promise) await result;
  }
}

export function normalizeFootballName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
    .replace(/\b(cf|fc|rcd|rc|cd|ud|sd|ad|ce|real|de|del|la|el|balompie|futbol|football|club)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function tokenSimilarity(left: string, right: string) {
  const a = new Set(normalizeFootballName(left).split(" ").filter(Boolean));
  const b = new Set(normalizeFootballName(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  return (2 * shared) / (a.size + b.size);
}

export function percentile(value: number, population: readonly number[]) {
  if (!population.length) return 50;
  const below = population.filter((candidate) => candidate < value).length;
  const equal = population.filter((candidate) => candidate === value).length;
  return Math.round(((below + Math.max(0, equal - 1) / 2) / Math.max(1, population.length - 1)) * 100);
}
