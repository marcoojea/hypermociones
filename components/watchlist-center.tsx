"use client";

import Link from "next/link";
import type { PlayerListItem, TeamSummary } from "@/domain/player";
import { useRecommendations } from "./use-recommendations";
import { useWatchlist } from "./use-watchlist";

export function WatchlistCenter({ players, teams, round }: { players: PlayerListItem[]; teams: TeamSummary[]; round: number }) {
  const { playerIds, toggle, loaded } = useWatchlist();
  const { byPlayer } = useRecommendations(players, teams, round);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const selected = playerIds.flatMap((id) => [playerById.get(id)].filter(Boolean) as PlayerListItem[]);
  return <><section className="page-header"><div><p className="eyebrow">Radar personal · Jornada {round}</p><h1>Seguimiento</h1><p>Reúne jugadores y detecta cambios de disponibilidad, probabilidad y recomendación.</p></div><div className="header-stat"><strong>{selected.length}</strong><span>seguidos</span></div></section>{!loaded ? <section className="setup-state"><span>H</span><div><h2>Cargando seguimiento</h2></div></section> : selected.length === 0 ? <section className="empty-tool"><strong>Tu radar está vacío</strong><p>Añade estrellas desde la Tier list o el comparador.</p><Link className="button button-primary" href="/tiers">Explorar Tier list →</Link></section> : <div className="watchlist-grid">{selected.map((player) => { const recommendation = byPlayer.get(player.id); return <article key={player.id}><span className={`tier-badge tier-${recommendation?.tier.replace("+", "plus").toLowerCase()}`}>{recommendation?.tier ?? "NR"}</span><button aria-label={`Quitar ${player.name}`} onClick={() => toggle(player.id)} type="button">★</button><Link href={`/player/${player.slug}`}><h2>{player.name}</h2><p>{player.team.name} · {player.position}</p></Link><div><span><b>{recommendation?.startingProbability === null ? "—" : `${recommendation?.startingProbability}%`}</b><small>jugar</small></span><span><b>{recommendation?.recommendationScore ?? "—"}</b><small>score</small></span></div>{recommendation?.risks.length ? <p className="watch-alert">{recommendation.risks[0]}</p> : <p className="watch-ok">Sin alertas detectadas</p>}</article>; })}</div>}</>;
}
