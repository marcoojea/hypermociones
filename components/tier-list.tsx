"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerListItem, Position, TeamSummary } from "@/domain/player";
import { playerTiers, type PlayerTier } from "@/domain/recommendation";
import { useRecommendations } from "./use-recommendations";
import { useWatchlist } from "./use-watchlist";

const positions: Array<{ key: Position; label: string }> = [{ key: "DEL", label: "Delanteros" }, { key: "MED", label: "Centrocampistas" }, { key: "DEF", label: "Defensas" }, { key: "POR", label: "Porteros" }];
const sourceLabels = { MIXED: "Mixto", EDITORIAL: "Editorial", MODEL: "Modelo", UNRATED: "Sin evaluar" } as const;

export function TierList({ players, teams, round }: { players: PlayerListItem[]; teams: TeamSummary[]; round: number }) {
  const [position, setPosition] = useState<Position>("DEL");
  const [tier, setTier] = useState<PlayerTier | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const { recommendations, editorialCount, loaded } = useRecommendations(players, teams, round);
  const { watched, toggle } = useWatchlist();
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const visible = recommendations.filter((item) => item.position === position && (tier === "ALL" || item.tier === tier)).filter((item) => playerById.get(item.playerId)?.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  return <>
    <section className="tier-hero"><div><p className="eyebrow">Jornada {round} · Recomendación explicable</p><h1>Tier list</h1><p>Probabilidad estimada de jugar y recomendación S+–C separadas por posición.</p></div><div className="tier-hero-score"><strong>{visible.filter((item) => item.tier !== "NR").length}</strong><span>evaluados</span><small>{editorialCount} con confianza editorial</small></div></section>
    <div className="tier-controls"><nav aria-label="Posición">{positions.map((item) => <button className={position === item.key ? "active" : ""} key={item.key} onClick={() => setPosition(item.key)} type="button">{item.label}</button>)}</nav><label><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jugador…" /></label><label><span>Tier</span><select value={tier} onChange={(event) => setTier(event.target.value as PlayerTier | "ALL")}><option value="ALL">Todos</option>{playerTiers.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <div className="tier-legend"><span><b>S+</b> Prioridad máxima</span><span><b>S</b> Muy recomendable</span><span><b>A</b> Recomendable</span><span><b>B</b> Situacional</span><span><b>C</b> Riesgo alto</span><span><b>NR</b> Sin datos suficientes</span></div>
    {!loaded ? <section className="setup-state"><span>H</span><div><p className="eyebrow">Calculando</p><h2>Combinando tus alineaciones y partes locales</h2></div></section> : <div className="tier-groups">{playerTiers.map((tierCode) => { const entries = visible.filter((item) => item.tier === tierCode); if (!entries.length) return null; return <section className={`tier-group tier-${tierCode.replace("+", "plus").toLowerCase()}`} key={tierCode}><header><strong>{tierCode}</strong><span>{entries.length} jugadores</span></header><div>{entries.slice(0, 35).map((item, index) => { const player = playerById.get(item.playerId)!; return <article className="tier-player" key={item.playerId}><span className="tier-rank">{String(index + 1).padStart(2, "0")}</span><Link href={`/player/${player.slug}`}><strong>{player.name}</strong><small>{player.team.shortName} · {sourceLabels[item.source]} · cobertura {item.coverage.toLowerCase()}</small></Link><div><b>{item.startingProbability === null ? "—" : `${item.startingProbability}%`}</b><small>jugar</small></div><div><b>{item.recommendationScore ?? "—"}</b><small>score</small></div><button aria-label={watched.has(player.id) ? `Quitar ${player.name} de seguimiento` : `Seguir a ${player.name}`} className={watched.has(player.id) ? "watched" : ""} onClick={() => toggle(player.id)} title="Seguimiento" type="button">★</button><details><summary>Por qué</summary><ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}{item.risks.map((risk) => <li className="risk" key={risk}>{risk}</li>)}</ul></details></article>; })}</div></section>; })}</div>}
    <p className="analytics-disclaimer"><strong>Importante:</strong> NR significa que el catálogo todavía no ofrece suficientes señales. Los porcentajes editoriales proceden de alineaciones guardadas en este dispositivo; los demás solo aparecen si existen minutos o titularidades históricas.</p>
  </>;
}
