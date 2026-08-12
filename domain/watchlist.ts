export const watchlistStorageKey = "hypermociones:watchlist:v1";
export interface WatchlistState { version: 1; playerIds: string[]; updatedAt: string; }

export function emptyWatchlist(): WatchlistState { return { version: 1, playerIds: [], updatedAt: new Date(0).toISOString() }; }
export function isWatchlistState(value: unknown): value is WatchlistState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<WatchlistState>;
  return state.version === 1 && typeof state.updatedAt === "string" && Array.isArray(state.playerIds) && state.playerIds.length <= 200
    && state.playerIds.every((id) => typeof id === "string" && id.length > 0) && new Set(state.playerIds).size === state.playerIds.length;
}
