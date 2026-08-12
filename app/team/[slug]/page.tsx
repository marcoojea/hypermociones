import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { FixtureListItem } from "@/domain/fixture";
import type { PlayerListItem, Position } from "@/domain/player";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

const positionLabels: Record<Position, string> = { POR: "Porteros", DEF: "Defensas", MED: "Centrocampistas", DEL: "Delanteros" };
const positions: Position[] = ["POR", "DEF", "MED", "DEL"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const team = (await playerRepository.listTeams()).find((item) => item.slug === slug);
  return { title: team?.name ?? "Equipo no encontrado", description: team ? `Plantilla, calendario y alineación probable de ${team.name}.` : undefined };
}

function FixtureStrip({ fixture, teamId }: { fixture: FixtureListItem; teamId: string }) {
  const rival = fixture.homeTeam.id === teamId ? fixture.awayTeam : fixture.homeTeam;
  const side = fixture.homeTeam.id === teamId ? "Local" : "Visitante";
  return <div className="team-fixture"><span><small>J{fixture.round} · {side}</small><strong>{fixture.homeTeam.id === teamId ? "vs" : "@"} {rival.name}</strong></span><time>{new Date(fixture.kickoffAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</time></div>;
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const [teams, allFixtures] = await Promise.all([playerRepository.listTeams(), fixtureRepository.findAll()]);
  const team = teams.find((item) => item.slug === slug);
  if (!team) notFound();
  const players = await playerRepository.findMany({ team: team.slug, sort: "name", direction: "asc" });
  const fixtures = allFixtures.filter((fixture) => fixture.homeTeam.id === team.id || fixture.awayTeam.id === team.id);
  const averageAge = players.filter((player) => player.age !== null).reduce((sum, player) => sum + (player.age ?? 0), 0) / Math.max(players.filter((player) => player.age !== null).length, 1);
  const unavailable = players.filter((player) => player.status === "INJURED" || player.status === "SUSPENDED" || player.status === "DOUBTFUL");

  return <AppShell active="teams">
    <div className="breadcrumb"><Link href="/teams">Equipos</Link><span>/</span><span>{team.name}</span></div>
    <section className="team-hero"><div className="team-hero-token" style={{ background: team.primaryColor }}>{team.shortName}</div><div><p className="eyebrow">LaLiga Hypermotion · 2026/27</p><h1>{team.name}</h1><p>Plantilla mostrada actualmente en la ficha oficial de la RFEF.</p></div><div className="team-hero-actions"><Link className="button button-primary" href={`/lineups/editor?team=${team.slug}&round=1`}>Editar alineación →</Link><Link className="button team-secondary-action" href={`/lineups?round=1`}>Ver jornada</Link></div></section>
    <section className="team-kpis"><div><span>Plantilla</span><strong>{players.length}</strong><small>jugadores</small></div><div><span>Edad media</span><strong>{averageAge.toFixed(1)}</strong><small>años</small></div><div><span>Disponibilidad</span><strong>{unavailable.length || "—"}</strong><small>{unavailable.length ? "con incidencia" : "sin datos oficiales"}</small></div><div><span>Próximos</span><strong>{fixtures.length}</strong><small>partidos cargados</small></div></section>
    <div className="team-detail-grid"><section className="panel team-squad-panel"><div className="panel-heading"><div><p className="eyebrow">Plantilla oficial</p><h2>Jugadores por posición</h2></div></div>{positions.map((position) => {
      const group = players.filter((player) => player.position === position);
      return <div className="squad-group" key={position}><div className="squad-group-title"><strong>{positionLabels[position]}</strong><span>{group.length}</span></div><div className="squad-list">{group.map((player) => <Link href={`/player/${player.slug}`} key={player.id}><span className="squad-number">{player.shirtNumber ?? "—"}</span><span><strong>{player.name}</strong><small>{player.age !== null ? `${player.age} años` : "Edad no disponible"}{player.heightCm ? ` · ${player.heightCm} cm` : ""}</small></span><i>→</i></Link>)}</div></div>;
    })}</section>
      <aside className="team-side"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Calendario</p><h2>Próximos partidos</h2></div></div><div className="team-fixtures">{fixtures.map((fixture) => <FixtureStrip fixture={fixture} teamId={team.id} key={fixture.id} />)}{fixtures.length === 0 && <p className="lineup-empty">Calendario pendiente.</p>}</div></section>
      <section className="panel availability-panel"><div className="panel-heading"><div><p className="eyebrow">Disponibilidad</p><h2>Alertas de plantilla</h2></div></div>{unavailable.length ? unavailable.map((player: PlayerListItem) => <Link href={`/player/${player.slug}`} key={player.id}><strong>{player.name}</strong><span>{player.status}</span></Link>) : <div className="availability-empty"><strong>Sin partes oficiales cargados</strong><p>La RFEF no publica actualmente lesiones o dudas en estas fichas. No damos por disponible a ningún jugador sin una fuente.</p></div>}</section></aside>
    </div>
  </AppShell>;
}
