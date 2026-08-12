import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PlayerComparator } from "@/components/player-comparator";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Comparador de jugadores", description: "Compara titularidad, Tier, métricas y próximos partidos entre jugadores." };
export default async function ComparePage() { const [players, teams, fixtures] = await Promise.all([playerRepository.findMany(), playerRepository.listTeams(), fixtureRepository.findAll()]); const round = fixtures.find((fixture) => fixture.round !== null)?.round ?? 1; return <AppShell active="compare"><PlayerComparator players={players} teams={teams} fixtures={fixtures} round={round} /></AppShell>; }
