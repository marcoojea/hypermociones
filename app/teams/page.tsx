import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Equipos", description: "Plantillas oficiales y calendario de los 22 clubes de LaLiga Hypermotion." };

export default async function TeamsPage() {
  const [teams, players, fixtures, provenance] = await Promise.all([
    playerRepository.listTeams(), playerRepository.findMany(), fixtureRepository.findAll(), playerRepository.getProvenance(),
  ]);
  const countByTeam = new Map<string, number>();
  for (const player of players) countByTeam.set(player.team.id, (countByTeam.get(player.team.id) ?? 0) + 1);
  const nextByTeam = new Map<string, (typeof fixtures)[number]>();
  for (const fixture of fixtures) {
    if (!nextByTeam.has(fixture.homeTeam.id)) nextByTeam.set(fixture.homeTeam.id, fixture);
    if (!nextByTeam.has(fixture.awayTeam.id)) nextByTeam.set(fixture.awayTeam.id, fixture);
  }

  return <AppShell active="teams">
    <section className="page-header"><div><p className="eyebrow">Temporada {provenance.season} · Plantillas RFEF</p><h1>Equipos</h1><p>Los 22 clubes, sus jugadores actuales y el contexto de la primera jornada.</p></div><div className="header-stat"><strong>{teams.length}</strong><span>clubes</span></div></section>
    <div className="team-directory">{teams.map((team) => {
      const next = nextByTeam.get(team.id);
      const rival = next ? (next.homeTeam.id === team.id ? next.awayTeam : next.homeTeam) : null;
      const venue = next?.homeTeam.id === team.id ? "Local" : "Visitante";
      return <Link className="team-card" href={`/team/${team.slug}`} key={team.id}>
        <div className="team-card-top"><span className="team-crest-token" style={{ background: team.primaryColor }}>{team.shortName}</span><span className="team-card-arrow">↗</span></div>
        <h2>{team.name}</h2><p>{countByTeam.get(team.id) ?? 0} jugadores en la ficha oficial</p>
        <div className="team-card-fixture"><small>Próximo partido · {venue}</small><strong>{rival ? `${next?.homeTeam.id === team.id ? "vs" : "@"} ${rival.shortName}` : "Por confirmar"}</strong></div>
      </Link>;
    })}</div>
  </AppShell>;
}
