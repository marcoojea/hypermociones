"use client";

import Link from "next/link";
import type { PlayerListItem, Position, TeamSummary } from "@/domain/player";
import { useRecommendations } from "./use-recommendations";

const positionLabels: Record<Position, string> = { POR: "Porteros", DEF: "Defensas", MED: "Centrocampistas", DEL: "Delanteros" };
export function RankingsCenter({ players, teams, round }: { players: PlayerListItem[]; teams: TeamSummary[]; round: number }) {
  const { recommendations } = useRecommendations(players, teams, round);
  const byId = new Map(players.map((player) => [player.id, player]));
  const rated = recommendations.filter((item) => item.recommendationScore !== null);
  const groups = (["POR", "DEF", "MED", "DEL"] as Position[]).map((position) => ({ position, items: rated.filter((item) => item.position === position).slice(0, 5) }));
  return <><section className="page-header"><div><p className="eyebrow">Jornada {round} · Rankings explicables</p><h1>Recomendaciones</h1><p>Mejores opciones por posición, titularidad segura y capitanes. Solo aparecen jugadores evaluables.</p></div><div className="header-stat"><strong>{rated.length}</strong><span>evaluables</span></div></section><section className="ranking-feature"><div><p className="eyebrow">Capitanes</p><h2>Prioridad de la jornada</h2></div>{rated.slice(0, 3).map((item, index) => { const player = byId.get(item.playerId)!; return <Link href={`/player/${player.slug}`} key={item.playerId}><b>0{index + 1}</b><span><strong>{player.name}</strong><small>{player.position} · {player.team.shortName}</small></span><em>{item.tier}</em><span><strong>{item.startingProbability}%</strong><small>jugar</small></span></Link>; })}{!rated.length && <p className="analytics-disclaimer">Añade confianza editorial en Alineaciones para activar recomendaciones antes de disponer de histórico.</p>}</section><div className="ranking-grid">{groups.map(({ position, items }) => <section className="panel" key={position}><p className="eyebrow">Top por posición</p><h2>{positionLabels[position]}</h2>{items.map((item, index) => { const player = byId.get(item.playerId)!; return <Link className="ranking-row" href={`/player/${player.slug}`} key={item.playerId}><b>{index + 1}</b><span><strong>{player.name}</strong><small>{player.team.shortName}</small></span><em>{item.tier}</em><span>{item.recommendationScore}</span></Link>; })}{!items.length && <p className="ranking-empty">Sin señales suficientes.</p>}</section>)}</div></>;
}
