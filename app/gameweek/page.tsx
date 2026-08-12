import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { GameweekCenter } from "@/components/gameweek-center";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";
export const metadata: Metadata = { title: "Centro de jornada", description: "Partidos, alineaciones, cambios, tiers y alertas de tu plantilla." };
export default async function GameweekPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) { const [{ round }, allFixtures, players, teams] = await Promise.all([searchParams, fixtureRepository.findAll(), playerRepository.findMany(), playerRepository.listTeams()]); const rounds = [...new Set(allFixtures.flatMap((fixture) => fixture.round === null ? [] : [fixture.round]))].sort((a, b) => a - b); const selectedRound = Number(round) || rounds[0] || 1; return <AppShell active="gameweek"><GameweekCenter fixtures={allFixtures.filter((fixture) => fixture.round === selectedRound)} players={players} teams={teams} round={selectedRound} /></AppShell>; }
