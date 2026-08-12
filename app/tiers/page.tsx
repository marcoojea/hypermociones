import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TierList } from "@/components/tier-list";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Tier list Fantasy", description: "Tier S+ a C por posición, titularidad estimada y razones de cada recomendación." };
export default async function TiersPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const [{ round }, players, teams, fixtures] = await Promise.all([searchParams, playerRepository.findMany(), playerRepository.listTeams(), fixtureRepository.findAll()]);
  const rounds = [...new Set(fixtures.flatMap((fixture) => fixture.round === null ? [] : [fixture.round]))].sort((a, b) => a - b);
  const selectedRound = Number(round) || rounds[0] || 1;
  return <AppShell active="tiers"><TierList players={players} teams={teams} round={selectedRound} /></AppShell>;
}
