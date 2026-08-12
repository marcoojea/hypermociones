"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerListItem, Position, TeamSummary } from "@/domain/player";
import { playerTiers, type PlayerRecommendation, type PlayerTier } from "@/domain/recommendation";
import { useRecommendations } from "./use-recommendations";
import { useWatchlist } from "./use-watchlist";

const positions: Array<{ key: Position; label: string }> = [{ key: "DEL", label: "Delanteros" }, { key: "MED", label: "Centrocampistas" }, { key: "DEF", label: "Defensas" }, { key: "POR", label: "Porteros" }];
const sourceLabels = { MIXED: "Mixto", EDITORIAL: "Editorial", MODEL: "Datos reales", UNRATED: "Sin evaluar" } as const;
type TierSort = "score" | "starting" | "impact" | "relevance" | "value" | "team" | "name";

const number = (value: number | null) => value ?? -1;
const money = (value: number | null) => value === null ? "—" : value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} M€` : `${Math.round(value / 1_000).toLocaleString("es-ES")} mil €`;
function compare(sort: TierSort, left: PlayerRecommendation, right: PlayerRecommendation, players: Map<string, PlayerListItem>) {
  if (sort === "name") return (players.get(left.playerId)?.name ?? "").localeCompare(players.get(right.playerId)?.name ?? "", "es");
  if (sort === "team") return (players.get(left.playerId)?.team.name ?? "").localeCompare(players.get(right.playerId)?.team.name ?? "", "es") || number(right.recommendationScore) - number(left.recommendationScore);
  if (sort === "starting") return number(right.startingProbability) - number(left.startingProbability);
  if (sort === "impact") return number(right.impactScore) - number(left.impactScore);
  if (sort === "relevance") return number(right.relevanceScore) - number(left.relevanceScore);
  if (sort === "value") return number(right.marketValueEur) - number(left.marketValueEur);
  return number(right.recommendationScore) - number(left.recommendationScore) || number(right.startingProbability) - number(left.startingProbability);
}

export function TierList({ players, teams, round }: { players: PlayerListItem[]; teams: TeamSummary[]; round: number }) {
  const [position, setPosition] = useState<Position>("DEL");
  const [tier, setTier] = useState<PlayerTier | "ALL">("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<TierSort>("score");
  const [query, setQuery] = useState("");
  const { recommendations, editorialCount, loaded } = useRecommendations(players, teams, round);
  const { watched, toggle } = useWatchlist();
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const visible = useMemo(() => recommendations.filter((item) => {
    const player = playerById.get(item.playerId);
    return item.position === position && (tier === "ALL" || item.tier === tier) && (team === "ALL" || player?.team.id === team)
      && Boolean(player?.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  }).sort((left, right) => compare(sort, left, right, playerById)), [recommendations, playerById, position, tier, team, query, sort]);
  const evaluated = recommendations.filter((item) => item.tier !== "NR").length;
  const withMarket = players.filter((player) => player.marketValue).length;
  return <>
    <section className="tier-hero"><div><p className="eyebrow">Jornada {round} · Modelo 2025/26 + contexto 2026/27</p><h1>Tier list real</h1><p>Probabilidad, impacto, relevancia y valor contrastados, comparados siempre dentro de la misma posición.</p></div><div className="tier-hero-score"><strong>{evaluated}</strong><span>jugadores evaluados</span><small>{withMarket} con valor · {editorialCount} con señal editorial</small></div></section>
    <div className="tier-controls"><nav aria-label="Posición">{positions.map((item) => <button className={position === item.key ? "active" : ""} key={item.key} onClick={() => setPosition(item.key)} type="button">{item.label}</button>)}</nav><label><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jugador…" /></label><label><span>Equipo</span><select value={team} onChange={(event) => setTeam(event.target.value)}><option value="ALL">Todos los equipos</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.shortName} · {item.name}</option>)}</select></label><label><span>Tier</span><select value={tier} onChange={(event) => setTier(event.target.value as PlayerTier | "ALL")}><option value="ALL">Todos</option>{playerTiers.map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as TierSort)}><option value="score">Recomendación</option><option value="starting">Probabilidad de jugar</option><option value="impact">Impacto</option><option value="relevance">Relevancia</option><option value="value">Valor de mercado</option><option value="team">Equipo</option><option value="name">Nombre</option></select></label></div>
    <div className="tier-legend"><span><b>S+</b> Prioridad máxima</span><span><b>S</b> Muy recomendable</span><span><b>A</b> Recomendable</span><span><b>B</b> Situacional</span><span><b>C</b> Riesgo alto</span><span><b>NR</b> Sin histórico suficiente</span></div>
    {!loaded ? <section className="setup-state"><span>H</span><div><p className="eyebrow">Calculando</p><h2>Combinando datos históricos, mercado y señales locales</h2></div></section> : visible.length === 0 ? <section className="setup-state"><span>0</span><div><p className="eyebrow">Sin resultados</p><h2>Cambia el equipo, tier o búsqueda</h2></div></section> : <div className="tier-groups">{playerTiers.map((tierCode) => { const entries = visible.filter((item) => item.tier === tierCode); if (!entries.length) return null; return <section className={`tier-group tier-${tierCode.replace("+", "plus").toLowerCase()}`} key={tierCode}><header><strong>{tierCode}</strong><span>{entries.length} jugadores</span></header><div>{entries.map((item, index) => { const player = playerById.get(item.playerId)!; return <article className="tier-player" key={item.playerId}><span className="tier-rank">{String(index + 1).padStart(2, "0")}</span><Link href={`/player/${player.slug}`}><strong>{player.name}</strong><small>{player.team.shortName} · {sourceLabels[item.source]} · cobertura {item.coverage.toLowerCase()}</small></Link><div><b>{item.startingProbability === null ? "—" : `${item.startingProbability}%`}</b><small>jugar</small></div><div><b>{item.recommendationScore ?? "—"}</b><small>score</small></div><div><b>{item.impactScore ?? "—"}</b><small>impacto</small></div><div><b>{item.relevanceScore ?? "—"}</b><small>relevancia</small></div><div className="tier-market"><b>{money(item.marketValueEur)}</b><small>valor mercado</small></div><button aria-label={watched.has(player.id) ? `Quitar ${player.name} de seguimiento` : `Seguir a ${player.name}`} className={watched.has(player.id) ? "watched" : ""} onClick={() => toggle(player.id)} title="Seguimiento" type="button">★</button><details><summary>Por qué aparece aquí</summary><ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}{item.risks.map((risk) => <li className="risk" key={risk}>{risk}</li>)}</ul></details></article>; })}</div></section>; })}</div>}
    <p className="analytics-disclaimer"><strong>Cómo leerlo:</strong> el porcentaje no es una certeza. Parte de titularidades, apariciones y minutos reales de 2025/26; el score añade impacto y relevancia normalizados por posición y solo un 10% de señal de valor de mercado. El valor es una estimación de mercado fechada, no el precio de ningún juego Fantasy. NR queda reservado a perfiles sin histórico suficiente.</p>
  </>;
}
