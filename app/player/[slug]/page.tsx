import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlayerAvailabilityDetail, PlayerAvailabilityStatus } from "@/components/player-availability";
import { playerRepository } from "@/repositories/snapshot-player-repository";

const metric = (value: number | null, decimals = 0) => value === null ? "—" : value.toFixed(decimals);

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
        <div className="profile-fixture"><small>Próximo partido</small><strong>{player.nextOpponent ?? "Por confirmar"}</strong>{player.fixtureDifficulty !== null ? <span className={`difficulty d${player.fixtureDifficulty}`}>Dificultad <b>{player.fixtureDifficulty}</b></span> : <small>Dificultad aún no calculada</small>}</div>
        <div className="profile-fis"><strong>{metric(player.fis, 1)}</strong><span>Fantasy Intelligence Score</span><small>{player.fis === null ? "Pendiente de histórico suficiente" : "Indicador provisional · no predictivo"}</small></div>
      </section>

      <section className="stat-grid">
        {[ ["Minutos", metric(player.minutes)], ["Titularidades", player.starts !== null && player.appearances !== null ? `${player.starts}/${player.appearances}` : "—"], ["Goles", metric(player.goals)], ["Asistencias", metric(player.assists)], ["Amarillas", metric(player.yellowCards ?? null)], ["Rojas", metric(player.redCards ?? null)], ["xG", metric(player.xg, 2)], ["xA", metric(player.xa, 2)] ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>
      <PlayerAvailabilityDetail player={player} />

      <div className="detail-grid">
        <section className="panel trend-panel"><div className="panel-heading"><div><p className="eyebrow">Últimas jornadas</p><h2>Rendimiento reciente</h2></div><strong>{metric(player.form, 1)}<small>forma</small></strong></div>{player.recentPoints.length ? <><div className="chart" aria-label="Puntos en las últimas jornadas">{player.recentPoints.map((points, index) => <div className="chart-column" key={index}><span>{points}</span><div style={{ height: `${Math.max((points / maxPoints) * 100, 5)}%` }} /><small>J{index + 1}</small></div>)}</div><div className="minute-strip">{player.recentMinutes.map((minutes, index) => <span key={index}><small>J{index + 1}</small><b>{minutes}&apos;</b><i style={{ width: `${minutes / 0.9}%` }} /></span>)}</div></> : <div className="metric-unavailable"><strong>Sin histórico suficiente</strong><p>Esta sección aparecerá cuando el proveedor entregue partidos disputados y minutos.</p></div>}</section>
        <section className="panel explain-panel"><div className="panel-heading"><div><p className="eyebrow">Explainability</p><h2>Lectura del jugador</h2></div></div><div className="signals"><div><h3>Señales positivas</h3>{player.strengths.map((item) => <p className="positive" key={item}><b>+</b>{item}</p>)}</div><div><h3>Riesgos</h3>{player.risks.map((item) => <p className="negative" key={item}><b>!</b>{item}</p>)}</div></div></section>
      </div>
      <p className="disclaimer">Los guiones indican métricas no disponibles en la fuente, no valores cero. El FIS solo se mostrará cuando exista histórico suficiente y una versión documentada y testeada del cálculo.</p>
    </AppShell>
  );
}
