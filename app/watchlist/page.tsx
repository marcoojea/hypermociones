import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WatchlistCenter } from "@/components/watchlist-center";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";
export const metadata: Metadata = { title: "Seguimiento", description: "Radar local de jugadores, titularidad, Tier y alertas." };
export default async function WatchlistPage() { const [players, teams, fixtures] = await Promise.all([playerRepository.findMany(), playerRepository.listTeams(), fixtureRepository.findAll()]); const round = fixtures.find((fixture) => fixture.round !== null)?.round ?? 1; return <AppShell active="watchlist"><WatchlistCenter players={players} teams={teams} round={round} /></AppShell>; }
