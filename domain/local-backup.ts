export interface HypermocionesBackup {
  version: 1;
  app: "hypermociones";
  exportedAt: string;
  entries: Record<string, string>;
}

const allowedPatterns = [
  /^hypermociones:my-team:v1$/,
  /^hypermociones:availability:v1:\d+$/,
  /^hypermociones:lineup:v1:[^:]+:\d+$/,
  /^hypermociones:lineup-history:v1:[^:]+:\d+$/,
  /^hypermociones:watchlist:v1$/,
  /^hypermociones:planner:v1$/,
  /^hypermociones:market:v1$/,
];

export function isHypermocionesStorageKey(key: string) {
  return allowedPatterns.some((pattern) => pattern.test(key));
}

export function createBackup(entries: Iterable<[string, string]>, exportedAt = new Date().toISOString()): HypermocionesBackup {
  const safeEntries: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!isHypermocionesStorageKey(key)) continue;
    try { JSON.parse(value); safeEntries[key] = value; } catch { /* Ignore corrupt local values. */ }
  }
  return { version: 1, app: "hypermociones", exportedAt, entries: safeEntries };
}

export function parseBackup(value: unknown, maxEntries = 250): HypermocionesBackup | null {
  if (!value || typeof value !== "object") return null;
  const backup = value as Partial<HypermocionesBackup>;
  if (backup.version !== 1 || backup.app !== "hypermociones" || typeof backup.exportedAt !== "string" || !backup.entries || typeof backup.entries !== "object" || Array.isArray(backup.entries)) return null;
  const entries = Object.entries(backup.entries);
  if (entries.length > maxEntries) return null;
  for (const [key, raw] of entries) {
    if (!isHypermocionesStorageKey(key) || typeof raw !== "string" || raw.length > 1_000_000) return null;
    try { JSON.parse(raw); } catch { return null; }
  }
  return { version: 1, app: "hypermociones", exportedAt: backup.exportedAt, entries: Object.fromEntries(entries) };
}

export function backupCategory(key: string) {
  if (key.includes(":my-team:")) return "Mi equipo";
  if (key.includes(":availability:")) return "Disponibilidad";
  if (key.includes(":lineup:")) return "Alineaciones";
  if (key.includes(":lineup-history:")) return "Historial editorial";
  if (key.includes(":watchlist:")) return "Seguimiento";
  if (key.includes(":planner:")) return "Planificador";
  if (key.includes(":market:")) return "Mercado";
  return "Otro";
}
