import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LineupEditor } from "@/components/lineup-editor";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Editor de alineaciones", description: "Crea y guarda alineaciones probables de LaLiga Hypermotion." };

export default async function LineupEditorPage({ searchParams }: { searchParams: Promise<{ team?: string; round?: string }> }) {
  const params = await searchParams;
  const [teams, allPlayers, fixtures] = await Promise.all([playerRepository.listTeams(), playerRepository.findMany({ sort: "name", direction: "asc" }), fixtureRepository.findAll()]);
  const team = teams.find((item) => item.slug === params.team) ?? teams[0];
  const round = Number(params.round) || 1;
  const players = allPlayers.filter((player) => player.team.id === team.id);
  const fixture = fixtures.find((item) => item.round === round && (item.homeTeam.id === team.id || item.awayTeam.id === team.id)) ?? null;
  return <AppShell active="lineups"><LineupEditor teams={teams} team={team} players={players} round={round} fixture={fixture} /></AppShell>;
}
