import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LineupCenter } from "@/components/lineup-center";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Alineaciones probables", description: "Once probable, confianza y alternativas para LaLiga Hypermotion 2026/27." };

export default async function LineupsPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const [{ round }, fixtures, players, teams, provenance] = await Promise.all([
    searchParams, fixtureRepository.findAll(), playerRepository.findMany(), playerRepository.listTeams(), playerRepository.getProvenance(),
  ]);
  const rounds = [...new Set(fixtures.map((fixture) => fixture.round).filter((value): value is number => value !== null))];
  const selectedRound = Number(round) || rounds[0] || 1;
  const matches = fixtures.filter((fixture) => fixture.round === selectedRound);
  return <AppShell active="lineups">
    <section className="page-header"><div><p className="eyebrow">Temporada {provenance.season} · Centro de jornada</p><h1>Alineaciones</h1><p>Once probable, alternativas y confianza editorial por equipo.</p></div><div className="header-stat"><strong>J{selectedRound}</strong><span>{matches.length} partidos</span></div></section>
    <LineupCenter matches={matches} players={players} teams={teams} rounds={rounds} selectedRound={selectedRound} />
  </AppShell>;
}
