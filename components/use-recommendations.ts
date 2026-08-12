"use client";

import { useEffect, useMemo, useState } from "react";
import { effectivePlayerStatus } from "@/domain/availability";
import { isStoredLineup, lineupStorageKey } from "@/domain/lineup";
import { rankRecommendations, recommendPlayer } from "@/domain/recommendation";
import type { PlayerListItem, TeamSummary } from "@/domain/player";
import { useAvailability } from "./use-availability";

export function useRecommendations(players: PlayerListItem[], teams: TeamSummary[], round: number) {
  const [confidence, setConfidence] = useState<Map<string, number>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const { byPlayer: availability, loaded: availabilityLoaded } = useAvailability(round);
  useEffect(() => {
    const read = () => {
      const values = new Map<string, number>();
      for (const team of teams) {
        const raw = localStorage.getItem(lineupStorageKey(team.id, round));
        if (!raw) continue;
        try {
          const value: unknown = JSON.parse(raw);
          if (!isStoredLineup(value, team.id, round)) continue;
          for (const item of value.starters) if (item.playerId) values.set(item.playerId, item.confidence);
          for (const item of value.substitutes) if (!values.has(item.playerId)) values.set(item.playerId, item.confidence);
        } catch { /* Invalid local lineups are ignored. */ }
      }
      setConfidence(values); setLoaded(true);
    };
    const frame = window.requestAnimationFrame(read);
    window.addEventListener("hypermociones:lineup-saved", read);
    window.addEventListener("storage", read);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("hypermociones:lineup-saved", read); window.removeEventListener("storage", read); };
  }, [teams, round]);
  const recommendations = useMemo(() => rankRecommendations(players.map((player) => recommendPlayer({ player, status: effectivePlayerStatus(player, availability), editorialConfidence: confidence.get(player.id) ?? null }))), [players, availability, confidence]);
  return { recommendations, byPlayer: new Map(recommendations.map((item) => [item.playerId, item])), loaded: loaded && availabilityLoaded, editorialCount: confidence.size };
}
