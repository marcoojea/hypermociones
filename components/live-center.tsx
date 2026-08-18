"use client";

import { useCallback, useEffect, useState } from "react";

import type { LiveFeed, LiveMatch, LivePlayerStats } from "@/domain/live";

const statusLabel = { SCHEDULED: "Programado", LIVE: "En juego", HALFTIME: "Descanso", FINISHED: "Finalizado", POSTPONED: "Aplazado", CANCELLED: "Cancelado" } as const;

export function LiveCenter() {
  const [feed, setFeed] = useState<LiveFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/live", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setFeed(await response.json() as LiveFeed);
      setError(null);
    } catch {
      setError("No se pudo actualizar el centro live. Se mantiene la última captura visible.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const initialRequest = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialRequest);
  }, [refresh]);
  useEffect(() => {
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, (feed?.refreshAfterSeconds ?? 60) * 1_000);
    return () => window.clearInterval(interval);
  }, [feed?.refreshAfterSeconds, refresh]);

  if (loading && !feed) return <section className="live-loading" aria-live="polite"><span>●</span><strong>Conectando con el centro live…</strong></section>;
  if (!feed) return <LiveUnavailable message={error ?? "El centro live no está disponible."} />;

  const liveMatches = feed.matches.filter((match) => match.status === "LIVE" || match.status === "HALFTIME").length;
  const detailedMatches = feed.matches.filter((match) => match.events.length || match.teamStats.length || match.playerStats.length).length;
  return <>
    <section className="live-hero"><div><p className="eyebrow">Seguimiento centralizado · {feed.provider}</p><h1>Centro live</h1><p>Marcador, minuto, eventos y rendimiento en una sola captura compartida por todos los visitantes.</p></div><div className={`live-signal live-signal-${feed.status.toLowerCase()}`}><i /><span>{feed.status === "LIVE" ? `${liveMatches} en juego` : feed.status === "UNAVAILABLE" ? "Cobertura pendiente" : "Sin partidos en juego"}</span><small>{new Date(feed.fetchedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}{feed.stale ? " · captura anterior" : ""}</small></div></section>
    <div className="live-notice" role={feed.status === "UNAVAILABLE" || error ? "alert" : "status"}><strong>{error ?? feed.message}</strong><span>{feed.sourceUrl && <a href={feed.sourceUrl} rel="noreferrer" target="_blank">Abrir fuente ↗</a>}<button onClick={() => void refresh()} type="button">Actualizar ahora</button></span></div>
    <section className="live-kpis"><div><span>Partidos live</span><strong>{liveMatches}</strong></div><div><span>Partidos en ventana</span><strong>{feed.matches.length}</strong></div><div><span>Partidos con detalle</span><strong>{detailedMatches}</strong></div><div><span>Próxima consulta</span><strong>{Math.round(feed.refreshAfterSeconds / 60) || "<1"} min</strong></div></section>
    <p className="analytics-disclaimer"><strong>Puntos Fantasy: NEEDS CLARIFICATION.</strong> Se muestran métricas y rating del proveedor, pero no se calcula una puntuación hasta definir plataforma y reglas exactas. Cero nunca sustituye un dato ausente.</p>
    {feed.matches.length ? <div className="live-matches">{feed.matches.map((match, index) => <LiveMatchCard initiallyOpen={index === 0 && Boolean(match.teamStats.length)} key={match.id} match={match} />)}</div> : <LiveUnavailable message={feed.message} />}
  </>;
}

function LiveMatchCard({ match, initiallyOpen = false }: { match: LiveMatch; initiallyOpen?: boolean }) {
  const [details, setDetails] = useState(initiallyOpen || match.status === "LIVE" || match.status === "HALFTIME");
  const leaders = [...match.playerStats].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1)).slice(0, 8);
  return <article className={`live-match live-match-${match.status.toLowerCase()}`}>
    <header><time dateTime={match.kickoffAt}>{new Date(match.kickoffAt).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time><span>{statusLabel[match.status]}{match.elapsed !== null ? ` · ${match.elapsed}'` : ""}</span></header>
    <div className="live-score"><strong>{match.homeTeam.name}</strong><b>{match.homeScore ?? "—"}</b><i>:</i><b>{match.awayScore ?? "—"}</b><strong>{match.awayTeam.name}</strong></div>
    <button aria-expanded={details} className="live-detail-toggle" onClick={() => setDetails((value) => !value)} type="button">{details ? "Ocultar detalle" : "Ver eventos y métricas"}</button>
    {details && <div className="live-detail">
      <section><h2>Eventos</h2>{match.events.length ? <ol className="live-events">{match.events.map((event) => <li key={event.id}><time>{event.minute ?? "—"}{event.extraMinute ? `+${event.extraMinute}` : ""}&apos;</time><span><strong>{event.playerName ?? event.detail}</strong><small>{event.type === "GOAL" && event.assistName ? `Asistencia: ${event.assistName}` : event.detail}</small></span></li>)}</ol> : <p className="live-empty">Sin eventos publicados.</p>}</section>
      <section><h2>Estadísticas de equipo</h2>{match.teamStats.length ? <div className="live-team-stats">{["possession", "shots", "shotsOnTarget", "effectiveness", "corners", "fouls", "offsides", "saves", "yellowCards", "redCards"].map((key) => <StatComparison key={key} label={({ possession: "Posesión", shots: "Remates", shotsOnTarget: "A puerta", effectiveness: "Efectividad", corners: "Córners", fouls: "Faltas", offsides: "Fueras de juego", saves: "Paradas", yellowCards: "Amarillas", redCards: "Rojas" } as Record<string, string>)[key]} home={match.teamStats.find((stat) => stat.teamId === match.homeTeam.id)?.[key as keyof typeof match.teamStats[number]]} away={match.teamStats.find((stat) => stat.teamId === match.awayTeam.id)?.[key as keyof typeof match.teamStats[number]]} percentage={key === "possession" || key === "effectiveness"} />)}</div> : <p className="live-empty">Sin estadísticas de equipo publicadas.</p>}</section>
      <section className="live-player-section"><h2>Rendimiento individual</h2>{leaders.length ? <div className="live-player-table">{leaders.map((player) => <PlayerRow key={player.playerId} player={player} />)}</div> : <p className="live-empty">Sin estadísticas individuales publicadas.</p>}</section>
    </div>}
  </article>;
}

function StatComparison({ label, home, away, percentage = false }: { label: string; home: unknown; away: unknown; percentage?: boolean }) {
  const value = (candidate: unknown) => typeof candidate === "number" ? `${candidate}${percentage ? "%" : ""}` : "—";
  if (home === null && away === null) return null;
  return <div><b>{value(home)}</b><span>{label}</span><b>{value(away)}</b></div>;
}

function PlayerRow({ player }: { player: LivePlayerStats }) {
  return <div><span><strong>{player.playerName}</strong><small>{player.teamName} · {player.started ? "Titular" : "Suplente"}</small></span><b>{player.minutes ?? "—"}&apos;<small>Min</small></b><b>{player.goals}<small>G</small></b><b>{player.assists}<small>A</small></b><em>{player.rating?.toFixed(1) ?? "NR"}<small>Rating</small></em></div>;
}

function LiveUnavailable({ message }: { message: string }) {
  return <section className="live-unavailable"><span>LIVE</span><div><h2>Cobertura detallada pendiente</h2><p>{message}</p><p>La aplicación no sustituirá métricas ausentes por valores inventados. Los resultados consolidados continúan disponibles en Partidos.</p></div></section>;
}
