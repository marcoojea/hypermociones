import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlayerAvailabilityDetail, PlayerAvailabilityStatus } from "@/components/player-availability";
import { MyTeamAddButton } from "@/components/my-team-add-button";
import { playerRepository } from "@/repositories/snapshot-player-repository";

const metric = (value: number | null, decimals = 0) => value === null ? "—" : value.toFixed(decimals);
const money = (value: number | null | undefined) => value == null ? "—" : value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} M€` : `${Math.round(value / 1_000).toLocaleString("es-ES")} mil €`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const player = await playerRepository.findBySlug((await params).slug);
  return { title: player?.name ?? "Jugador no encontrado", description: player ? `Estadísticas y señales Fantasy de ${player.name}.` : undefined };
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const player = await playerRepository.findBySlug((await params).slug);
  if (!player) notFound();
  const maxPoints = Math.max(...player.recentPoints, 1);
  return (
    <AppShell active="players">
      <div className="breadcrumb"><Link href="/players">Jugadores</Link><span>/</span><span>{player.name}</span></div>
      <section className="profile-header">
        <div className="player-number" style={{ borderColor: player.team.primaryColor }}>{player.shirtNumber ?? "—"}</div>
        <div className="profile-title"><div><span className="position-badge">{player.position}</span><PlayerAvailabilityStatus player={player} /></div><h1>{player.name}</h1><p>{player.team.name} · {player.nationality}{player.age !== null ? ` · ${player.age} años` : ""}{player.heightCm ? ` · ${player.heightCm} cm` : ""}{player.weightKg ? ` · ${player.weightKg} kg` : ""}</p></div>
        <div className="profile-fixture"><small>Próximo partido</small><strong>{player.nextOpponent ?? "Por confirmar"}</strong>{player.fixtureDifficulty !== null ? <span className={`difficulty d${player.fixtureDifficulty}`}>Dificultad <b>{player.fixtureDifficulty}</b></span> : <small>Dificultad aún no calculada</small>}<MyTeamAddButton player={player} /></div>
        <div className="profile-fis"><strong>{player.previousSeason?.impactScore ?? "—"}</strong><span>Impacto por posición</span><small>{player.previousSeason ? `${player.previousSeason.season} · confianza ${player.previousSeason.confidence.toLowerCase()}` : "Pendiente de histórico suficiente"}</small></div>
      </section>

      <section className="stat-grid">
        {[ ["PJ 2025/26", metric(player.previousSeason?.appearances ?? null)], ["Titularidades", player.previousSeason?.starts === null || player.previousSeason?.starts === undefined ? "—" : `${player.previousSeason.starts}/${player.previousSeason.appearances}`], ["Minutos 2025/26", metric(player.previousSeason?.minutes ?? null)], ["Goles + asist.", player.previousSeason ? `${player.previousSeason.goals} + ${player.previousSeason.assists}` : "—"], ["Impacto", metric(player.previousSeason?.impactScore ?? null)], ["Relevancia", metric(player.previousSeason?.relevanceScore ?? null)], ["Valor mercado", money(player.marketValue?.amountEur)], ["Fecha valor", player.marketValue?.valuedAt ?? "—"] ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>
      <PlayerAvailabilityDetail player={player} />
      {player.previousSeason && <p className="analytics-disclaimer"><strong>Procedencia:</strong> rendimiento de la ficha pública de competición {player.previousSeason.season}. <a href={player.previousSeason.sourceUrl} rel="noreferrer" target="_blank">Consultar fuente</a>. El impacto y la relevancia se normalizan frente a jugadores de su misma posición. {player.marketValue && <>Valor estimado a {player.marketValue.valuedAt} mediante <a href={player.marketValue.sourceUrl} rel="noreferrer" target="_blank">dataset abierto</a>.</>}</p>}

      <div className="detail-grid">
        <section className="panel trend-panel"><div className="panel-heading"><div><p className="eyebrow">Últimas jornadas</p><h2>Rendimiento reciente</h2></div><strong>{metric(player.form, 1)}<small>forma</small></strong></div>{player.recentPoints.length ? <><div className="chart" aria-label="Puntos en las últimas jornadas">{player.recentPoints.map((points, index) => <div className="chart-column" key={index}><span>{points}</span><div style={{ height: `${Math.max((points / maxPoints) * 100, 5)}%` }} /><small>J{index + 1}</small></div>)}</div><div className="minute-strip">{player.recentMinutes.map((minutes, index) => <span key={index}><small>J{index + 1}</small><b>{minutes}&apos;</b><i style={{ width: `${minutes / 0.9}%` }} /></span>)}</div></> : <div className="metric-unavailable"><strong>Sin histórico suficiente</strong><p>Esta sección aparecerá cuando el proveedor entregue partidos disputados y minutos.</p></div>}</section>
        <section className="panel explain-panel"><div className="panel-heading"><div><p className="eyebrow">Explainability</p><h2>Lectura del jugador</h2></div></div><div className="signals"><div><h3>Señales positivas</h3>{player.strengths.map((item) => <p className="positive" key={item}><b>+</b>{item}</p>)}</div><div><h3>Riesgos</h3>{player.risks.map((item) => <p className="negative" key={item}><b>!</b>{item}</p>)}</div></div></section>
      </div>
      <p className="disclaimer">Los guiones indican métricas no disponibles en la fuente, no valores cero. El FIS solo se mostrará cuando exista histórico suficiente y una versión documentada y testeada del cálculo.</p>
    </AppShell>
  );
}
