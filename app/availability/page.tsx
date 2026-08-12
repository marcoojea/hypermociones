import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AvailabilityCenter } from "@/components/availability-center";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = {
  title: "Disponibilidad",
  description: "Centro de lesiones, sanciones, dudas y disponibilidad por jornada.",
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const rawRound = Number(first((await searchParams).round));
  const [players, teams, fixtures, provenance] = await Promise.all([
    playerRepository.findMany({ sort: "name", direction: "asc" }),
    playerRepository.listTeams(),
    fixtureRepository.findAll(),
    playerRepository.getProvenance(),
  ]);
  const rounds = [...new Set(fixtures.map((fixture) => fixture.round).filter((round): round is number => round !== null))].sort((a, b) => a - b);
  const selectedRound = rounds.includes(rawRound) ? rawRound : rounds[0] ?? 1;

  return <AppShell active="availability">
    <AvailabilityCenter players={players} teams={teams} rounds={rounds.length ? rounds : [1]} selectedRound={selectedRound} provenance={provenance} />
  </AppShell>;
}
