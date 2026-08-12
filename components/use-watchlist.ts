"use client";

import { useEffect, useState } from "react";
import { emptyWatchlist, isWatchlistState, watchlistStorageKey } from "@/domain/watchlist";

export function useWatchlist() {
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const read = () => { const raw = localStorage.getItem(watchlistStorageKey); if (!raw) { setPlayerIds([]); setLoaded(true); return; } try { const value: unknown = JSON.parse(raw); setPlayerIds(isWatchlistState(value) ? value.playerIds : []); } catch { setPlayerIds([]); } setLoaded(true); };
    const frame = window.requestAnimationFrame(read); window.addEventListener("storage", read); window.addEventListener("hypermociones:watchlist-changed", read);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("storage", read); window.removeEventListener("hypermociones:watchlist-changed", read); };
  }, []);
  const save = (ids: string[]) => { localStorage.setItem(watchlistStorageKey, JSON.stringify({ ...emptyWatchlist(), playerIds: ids.slice(0, 200), updatedAt: new Date().toISOString() })); window.dispatchEvent(new Event("hypermociones:watchlist-changed")); };
  const toggle = (playerId: string) => save(playerIds.includes(playerId) ? playerIds.filter((id) => id !== playerId) : [...playerIds, playerId]);
  return { playerIds, watched: new Set(playerIds), toggle, loaded };
}
