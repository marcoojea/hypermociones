import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MarketCenter } from "@/components/market-center";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";
export const metadata: Metadata = { title: "Mercado Fantasy", description: "Precios aportados, variaciones y rentabilidad por jugador sin valores inventados." };
export default async function MarketPage() { const [players, teams, fixtures] = await Promise.all([playerRepository.findMany(), playerRepository.listTeams(), fixtureRepository.findAll()]); const round = fixtures.find((fixture) => fixture.round !== null)?.round ?? 1; return <AppShell active="market"><MarketCenter players={players} teams={teams} round={round} /></AppShell>; }
