"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { emptyFantasyTeam, isMyFantasyTeam, myTeamStorageKey } from "@/domain/fantasy-team";
import type { PlayerListItem, TeamSummary } from "@/domain/player";
import { notifyProduct } from "@/domain/product-events";
import { emptyWatchlist, isWatchlistState, watchlistStorageKey } from "@/domain/watchlist";

const tools = [
  ["Centro de jornada", "/gameweek", "alertas partidos cierre"], ["Tiers", "/tiers", "ranking recomendación"],
  ["Mi equipo", "/my-team", "plantilla optimizador"], ["Comparador", "/compare", "comparar jugadores"],
  ["Planificador", "/planner", "escenarios fichajes"], ["Mercado", "/market", "precios variaciones"],
  ["Disponibilidad", "/availability", "lesiones sanciones dudas"], ["Alineaciones", "/lineups", "once confianza"],
] as const;

export function GlobalSearch({ players, teams }: { players: PlayerListItem[]; teams: TeamSummary[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  const normalized = query.trim().toLocaleLowerCase("es");
  const playerResults = useMemo(() => normalized ? players.filter((player) => `${player.name} ${player.team.name} ${player.position}`.toLocaleLowerCase("es").includes(normalized)).slice(0, 7) : players.slice(0, 5), [normalized, players]);
  const teamResults = useMemo(() => normalized ? teams.filter((team) => `${team.name} ${team.shortName}`.toLocaleLowerCase("es").includes(normalized)).slice(0, 4) : [], [normalized, teams]);
  const toolResults = useMemo(() => tools.filter(([name, , keywords]) => !normalized || `${name} ${keywords}`.toLocaleLowerCase("es").includes(normalized)).slice(0, 5), [normalized]);

  const addToMyTeam = (player: PlayerListItem) => {
    let team = emptyFantasyTeam(1);
    const raw = localStorage.getItem(myTeamStorageKey);
    if (raw) try { const parsed: unknown = JSON.parse(raw); if (isMyFantasyTeam(parsed)) team = parsed; } catch { /* Start safely. */ }
    if (team.squad.some((entry) => entry.playerId === player.id)) { notifyProduct(`${player.name} ya está en Mi equipo.`, "info"); return; }
    if (team.squad.length >= team.rules.squadSize) { notifyProduct("La plantilla ha alcanzado su límite.", "warning"); return; }
    const saved = { ...team, squad: [...team.squad, { playerId: player.id, purchasePrice: null, projectedPoints: null, startingChance: 50 }], updatedAt: new Date().toISOString() };
    localStorage.setItem(myTeamStorageKey, JSON.stringify(saved));
    notifyProduct(`${player.name} añadido a Mi equipo.`);
  };

  const follow = (player: PlayerListItem) => {
    let state = emptyWatchlist();
    const raw = localStorage.getItem(watchlistStorageKey);
    if (raw) try { const parsed: unknown = JSON.parse(raw); if (isWatchlistState(parsed)) state = parsed; } catch { /* Start safely. */ }
    if (state.playerIds.includes(player.id)) { notifyProduct(`${player.name} ya está en seguimiento.`, "info"); return; }
    const saved = { ...state, playerIds: [...state.playerIds, player.id], updatedAt: new Date().toISOString() };
    localStorage.setItem(watchlistStorageKey, JSON.stringify(saved));
    window.dispatchEvent(new Event("hypermociones:watchlist-changed"));
    notifyProduct(`${player.name} añadido a seguimiento.`);
  };

  return <>
    <button aria-keyshortcuts="Control+K Meta+K" className="global-search-trigger" onClick={() => setOpen(true)} type="button"><span>Buscar jugadores, equipos y herramientas</span><kbd>Ctrl K</kbd></button>
    {open && <div className="search-overlay">
      <button aria-label="Cerrar buscador" className="search-backdrop" onClick={() => setOpen(false)} type="button" />
      <section aria-label="Buscador global" aria-modal="true" className="global-search-dialog" role="dialog">
        <header><input aria-label="Buscar en Hypermociones" onChange={(event) => setQuery(event.target.value)} placeholder="Jugador, equipo o herramienta…" ref={inputRef} value={query} /><button aria-label="Cerrar buscador" onClick={() => setOpen(false)} type="button">×</button></header>
        <div className="global-search-results">
          {playerResults.length > 0 && <section><h2>Jugadores</h2>{playerResults.map((player) => <article className="search-player-result" key={player.id}><Link href={`/player/${player.slug}`} onClick={() => setOpen(false)}><span className="position-badge">{player.position}</span><span><strong>{player.name}</strong><small>{player.team.name}</small></span></Link><div><button aria-label={`Añadir ${player.name} a Mi equipo`} onClick={() => addToMyTeam(player)} type="button">+ Equipo</button><button aria-label={`Seguir a ${player.name}`} onClick={() => follow(player)} type="button">★ Seguir</button></div></article>)}</section>}
          {teamResults.length > 0 && <section><h2>Equipos</h2>{teamResults.map((team) => <Link href={`/team/${team.slug}`} key={team.id} onClick={() => setOpen(false)}><strong>{team.name}</strong><small>{team.shortName}</small></Link>)}</section>}
          {toolResults.length > 0 && <section><h2>Herramientas</h2>{toolResults.map(([name, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{name}<span>→</span></Link>)}</section>}
          {!playerResults.length && !teamResults.length && !toolResults.length && <div className="search-empty"><strong>Sin coincidencias</strong><p>Prueba con otro nombre o abre Jugadores para usar filtros avanzados.</p></div>}
        </div>
      </section>
    </div>}
  </>;
}
