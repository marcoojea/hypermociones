import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { SquadsCenter, type ProbableMatch, type ProbableSide, type SquadFixture, type SquadPlayer } from "@/components/squads-center";
import injuriesJson from "@/data/generated/espn-segunda-injuries.json";
import matchesJson from "@/data/generated/espn-segunda-matches.json";
import rostersJson from "@/data/generated/espn-segunda-rosters.json";
import type { SyncedInjuries, SyncedMatches, SyncedRosters, SyncMatch, SyncSideLineup } from "@/data/espn-segunda-types";
import { normalizePlayerName, sameTeam } from "@/domain/espn-soccer";
import { probableXi, probableXiFromEspn } from "@/domain/probable-lineup";
import { recommendPlayer } from "@/domain/recommendation";
import { activeRoundNumber } from "@/domain/segunda-matches";
import { aggregatePlayers, disciplineStatus } from "@/domain/segunda-stats";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = {
  title: "Plantillas de jornada",
  description: "Probabilidad de titularidad por jugador y jornada, estadísticas 2025/26 y directo de LaLiga Hypermotion 2026/27.",
};

const syncedMatches = matchesJson as SyncedMatches;
const syncedInjuries = injuriesJson as SyncedInjuries;
const syncedRosters = rostersJson as SyncedRosters;

const sideOf = (match: SyncMatch, teamName: string): SyncSideLineup | null =>
  sameTeam(match.home.name, teamName) ? match.lineups.home : sameTeam(match.away.name, teamName) ? match.lineups.away : null;

// Only matches played before the fixture count, so a finished fixture never shows its own XI as "probable".
function probableSide(fixture: SquadFixture, teamName: string, squad: SquadPlayer[]): ProbableSide {
  const day = fixture.kickoffAt.slice(0, 10);
  const prior = syncedMatches.matches.filter((match): match is SyncMatch & { date: string } => match.completed && match.date !== null && match.date < day);
  let last: { date: string; side: SyncSideLineup } | null = null;
  for (const match of prior) {
    const side = sideOf(match, teamName);
    if (side && (last === null || match.date > last.date)) last = { date: match.date, side };
  }
  const rosterTeam = syncedRosters.teams.find((team) => sameTeam(team.teamName, teamName));
  if (rosterTeam) {
    // ESPN names end to end: roster, last XI and 2026/27 totals. Totals match by normalized name only.
    const totals = aggregatePlayers(prior).filter((total) => sameTeam(total.teamName, teamName));
    const espnRoster = rosterTeam.athletes.map((athlete) => {
      const total = totals.find((item) => normalizePlayerName(item.name) === normalizePlayerName(athlete.name));
      return { espnId: athlete.espnId, name: athlete.name, starts: total?.starts ?? 0, minutes: total?.minutes ?? 0 };
    });
    const espnInjured = rosterTeam.athletes
      .filter((athlete) => athlete.status !== "active" || athlete.injuryDetail !== null)
      .map((athlete) => ({ name: athlete.name, reason: `Lesión · ${athlete.injuryDetail ?? athlete.status}` }));
    const espnSuspended = rosterTeam.athletes.flatMap((athlete) => {
      const status = disciplineStatus(prior, teamName, athlete.name);
      return status.suspendedNextMatch ? [{ name: athlete.name, reason: `Sanción · ${status.reason ?? "pendiente"}` }] : [];
    });
    const espnUnavailable = [...espnInjured, ...espnSuspended];
    const espnLineup = probableXiFromEspn({
      teamName,
      lastXi: last?.side.starters ?? null,
      lastBench: last?.side.bench ?? [],
      roster: espnRoster,
      unavailableNames: espnUnavailable.map((item) => item.name),
    });
    return {
      teamName,
      source: espnLineup.source,
      lastXiDate: last?.date ?? null,
      xi: espnLineup.xi,
      bench: espnLineup.bench,
      unresolved: espnLineup.unresolved,
      unavailable: espnUnavailable,
    };
  }
  const injured = syncedInjuries.injuries
    .filter((injury) => injury.status !== "active" && sameTeam(injury.teamName, teamName))
    .map((injury) => ({ name: injury.name, reason: `Lesión · ${injury.detail ?? injury.status}` }));
  const suspended = squad.flatMap((player) => {
    const status = disciplineStatus(prior, teamName, player.name);
    return status.suspendedNextMatch ? [{ name: player.name, reason: `Sanción · ${status.reason ?? "pendiente"}` }] : [];
  });
  const unavailable = [...injured, ...suspended];
  const lineup = probableXi({
    teamName,
    lastXi: last?.side.starters ?? null,
    lastBench: last?.side.bench ?? [],
    squad,
    unavailableNames: unavailable.map((item) => item.name),
  });
  return { teamName, source: lineup.source, lastXiDate: last?.date ?? null, xi: lineup.xi, bench: lineup.bench, unresolved: lineup.unresolved, unavailable };
}

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

  const squadOf = (teamId: string) => squads.filter((player) => player.teamId === teamId);
  const probables: Record<string, ProbableMatch> = {};
  for (const fixture of roundFixtures) {
    probables[fixture.id] = {
      home: probableSide(fixture, fixture.homeTeamName, squadOf(fixture.homeTeamId)),
      away: probableSide(fixture, fixture.awayTeamName, squadOf(fixture.awayTeamId)),
    };
  }

  return (
    <AppShell active="squads">
      <SquadsCenter round={selectedRound} rounds={rounds} fixtures={roundFixtures} squads={squads} notice={notice} probables={probables} />
    </AppShell>
  );
}
