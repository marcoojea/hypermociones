import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { FixturePlanner } from "@/components/fixture-planner";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";
export const metadata: Metadata = { title: "Planificador Fantasy", description: "Planifica tu plantilla y simula fichajes para las próximas cinco jornadas." };
export default async function PlannerPage() { const [players, teams, fixtures] = await Promise.all([playerRepository.findMany(), playerRepository.listTeams(), fixtureRepository.findAll()]); const rounds = [...new Set(fixtures.flatMap((fixture) => fixture.round === null ? [] : [fixture.round]))].sort((a, b) => a - b); return <AppShell active="planner"><FixturePlanner players={players} teams={teams} fixtures={fixtures} rounds={rounds} /></AppShell>; }
