import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { fixtureRepository } from "@/repositories/fixture-repository";

export const metadata: Metadata = { title: "Partidos", description: "Calendario real de LaLiga Hypermotion 2026/27 y resultados por jornada." };

const statusLabels: Record<string, string> = { SCHEDULED: "Programado", TIMED: "Programado", IN_PLAY: "En juego", PAUSED: "Descanso", FINISHED: "Finalizado", POSTPONED: "Aplazado", SUSPENDED: "Suspendido", CANCELLED: "Cancelado" };

export default async function FixturesPage() {
  const [fixtures, provenance] = await Promise.all([fixtureRepository.findAll(), fixtureRepository.getProvenance()]);
  const rounds = new Map<number | null, typeof fixtures>();
  for (const fixture of fixtures) rounds.set(fixture.round, [...(rounds.get(fixture.round) ?? []), fixture]);
  return (
    <AppShell active="fixtures">
      <section className="page-header"><div><p className="eyebrow">{provenance.mode === "REAL" ? `Calendario real · ${provenance.provider}` : "Datos pendientes"}</p><h1>Partidos</h1><p>{provenance.note}</p></div><div className="header-stat"><strong>{fixtures.length}</strong><span>partidos</span></div></section>
      {fixtures.length === 0 ? <section className="setup-state"><span>01</span><div><p className="eyebrow">Importación pendiente</p><h2>El calendario oficial está listo para importarse</h2><p>Ejecuta <code>npm.cmd run data:fetch</code>. El proveedor gratuito no necesita ninguna clave.</p></div></section> : <div className="fixture-rounds">
        {[...rounds.entries()].map(([round, matches]) => <section className="fixture-round" key={round ?? "unknown"}><div className="round-heading"><span>Jornada</span><strong>{round ?? "—"}</strong></div><div className="fixture-list">{matches.map((fixture) => { const date = new Date(fixture.kickoffAt); return <article className="fixture-row" key={fixture.id}><time dateTime={fixture.kickoffAt}><strong>{date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</strong><span>{fixture.status === "SCHEDULED" ? "Hora pendiente" : date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span></time><div className="fixture-team home"><span>{fixture.homeTeam.name}</span><b>{fixture.homeTeam.shortName}</b></div><div className="fixture-score">{fixture.status === "FINISHED" ? <strong>{fixture.homeScore} <i>—</i> {fixture.awayScore}</strong> : <strong>vs</strong>}<small>{statusLabels[fixture.status]}</small></div><div className="fixture-team"><b>{fixture.awayTeam.shortName}</b><span>{fixture.awayTeam.name}</span></div></article>})}</div></section>)}
      </div>}
    </AppShell>
  );
}
