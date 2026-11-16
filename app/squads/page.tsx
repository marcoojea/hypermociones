import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { SquadsCenter, type SquadFixture, type SquadPlayer } from "@/components/squads-center";
import { recommendPlayer } from "@/domain/recommendation";
import { activeRoundNumber } from "@/domain/segunda-matches";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = {
  title: "Plantillas de jornada",
  description: "Probabilidad de titularidad por jugador y jornada, estadísticas 2025/26 y directo de LaLiga Hypermotion 2026/27.",
};

export default async function SquadsPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const [{ round }, players, fixtures] = await Promise.all([searchParams, playerRepository.findMany(), fixtureRepository.findAll()]);
  const rounds = [...new Set(fixtures.flatMap((fixture) => (fixture.round === null ? [] : [fixture.round])))].sort((a, b) => a - b);
  const requested = round === undefined ? null : Number(round);
  const validRequest = requested !== null && Number.isInteger(requested) && requested > 0;
  const notice = requested !== null && !validRequest ? `Jornada no válida: "${round}". Se muestra la jornada activa.` : null;
  const selectedRound = requested !== null && validRequest ? requested : (activeRoundNumber(fixtures) ?? rounds[0] ?? 1);

  const roundFixtures: SquadFixture[] = fixtures
    .filter((fixture) => fixture.round === selectedRound)
    .map((fixture) => ({
      id: fixture.id,
      round: fixture.round,
      kickoffAt: fixture.kickoffAt,
      status: fixture.status,
      homeTeamId: fixture.homeTeam.id,
      homeTeamName: fixture.homeTeam.name,
      awayTeamId: fixture.awayTeam.id,
      awayTeamName: fixture.awayTeam.name,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
    }));
  const teamIds = new Set(roundFixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]));

  const squads: SquadPlayer[] = players
    .filter((player) => teamIds.has(player.team.id))
    .map((player) => ({
      id: player.id,
      name: player.name,
      teamId: player.team.id,
      teamName: player.team.name,
      position: player.position,
      shirtNumber: player.shirtNumber,
      historicalProbability: recommendPlayer({ player }).startingProbability,
      appearances: player.previousSeason?.appearances ?? null,
      starts: player.previousSeason?.starts ?? null,
      minutes: player.previousSeason?.minutes ?? null,
      goals: player.previousSeason?.goals ?? null,
      assists: player.previousSeason?.assists ?? null,
    }));

  return (
    <AppShell active="squads">
      <SquadsCenter round={selectedRound} rounds={rounds} fixtures={roundFixtures} squads={squads} notice={notice} />
    </AppShell>
  );
}
