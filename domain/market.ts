export const marketStorageKey = "hypermociones:market:v1";
export interface MarketEntry { playerId: string; value: number; change1d: number | null; change7d: number | null; updatedAt: string; }
export interface MarketState { version: 1; currency: "EUR"; entries: MarketEntry[]; updatedAt: string; }
export function emptyMarket(): MarketState { return { version: 1, currency: "EUR", entries: [], updatedAt: new Date(0).toISOString() }; }
export function isMarketState(value: unknown): value is MarketState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<MarketState>;
  if (state.version !== 1 || state.currency !== "EUR" || typeof state.updatedAt !== "string" || !Array.isArray(state.entries) || state.entries.length > 1000) return false;
  const ids = new Set<string>();
  return state.entries.every((entry) => entry && typeof entry.playerId === "string" && !ids.has(entry.playerId) && (ids.add(entry.playerId), true) && typeof entry.value === "number" && Number.isFinite(entry.value) && entry.value >= 0 && (entry.change1d === null || typeof entry.change1d === "number" && Number.isFinite(entry.change1d)) && (entry.change7d === null || typeof entry.change7d === "number" && Number.isFinite(entry.change7d)) && typeof entry.updatedAt === "string");
}
