"use client";

import { useEffect, useState } from "react";
import { emptyFantasyTeam, isMyFantasyTeam, myTeamStorageKey, type MyFantasyTeam } from "@/domain/fantasy-team";
import type { PlayerListItem } from "@/domain/player";

export function MyTeamAddButton({ player }: { player: PlayerListItem }) {
  const [team, setTeam] = useState<MyFantasyTeam | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const raw = localStorage.getItem(myTeamStorageKey);
      if (!raw) { setTeam(emptyFantasyTeam()); return; }
      try { const parsed: unknown = JSON.parse(raw); setTeam(isMyFantasyTeam(parsed) ? parsed : emptyFantasyTeam()); }
      catch { setTeam(emptyFantasyTeam()); }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  if (!team) return null;
  const included = team.squad.some((entry) => entry.playerId === player.id);
  const full = team.squad.length >= team.rules.squadSize;
  const add = () => {
    if (included || full) return;
    const saved = { ...team, squad: [...team.squad, { playerId: player.id, purchasePrice: null, projectedPoints: null, startingChance: 60 }], updatedAt: new Date().toISOString() };
    localStorage.setItem(myTeamStorageKey, JSON.stringify(saved)); setTeam(saved);
  };
  return <button className="button profile-team-button" type="button" disabled={included || full} onClick={add}>{included ? "En Mi equipo ✓" : full ? "Plantilla completa" : "+ Añadir a Mi equipo"}</button>;
}
