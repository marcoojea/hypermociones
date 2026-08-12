import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MyTeamManager } from "@/components/my-team-manager";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Mi equipo", description: "Crea tu plantilla y optimiza la alineación con reglas configurables y explicaciones." };

export default async function MyTeamPage() {
  const [players, teams, fixtures, provenance] = await Promise.all([
    playerRepository.findMany({ sort: "name", direction: "asc" }), playerRepository.listTeams(), fixtureRepository.findAll(), playerRepository.getProvenance(),
  ]);
  const rounds = [...new Set(fixtures.map((fixture) => fixture.round).filter((round): round is number => round !== null))].sort((a, b) => a - b);
  return <AppShell active="my-team"><MyTeamManager players={players} teams={teams} rounds={rounds.length ? rounds : [1]} provenance={provenance} /></AppShell>;
}
