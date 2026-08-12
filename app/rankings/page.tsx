import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { RankingsCenter } from "@/components/rankings-center";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";
export const metadata: Metadata = { title: "Rankings Fantasy", description: "Capitanes y mejores recomendaciones por posición para la jornada." };
export default async function RankingsPage() { const [players, teams, fixtures] = await Promise.all([playerRepository.findMany(), playerRepository.listTeams(), fixtureRepository.findAll()]); const round = fixtures.find((fixture) => fixture.round !== null)?.round ?? 1; return <AppShell active="rankings"><RankingsCenter players={players} teams={teams} round={round} /></AppShell>; }
