import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { StatsCenter } from "@/components/stats-center";
import matchesJson from "@/data/generated/espn-segunda-matches.json";
import type { SyncedMatches } from "@/data/espn-segunda-types";
import { aggregatePlayers, aggregateTeams } from "@/domain/segunda-stats";

export const metadata: Metadata = {
  title: "Estadísticas",
  description: "Estadísticas de jugadores y equipos de LaLiga Hypermotion 2026/27 por jornada y acumuladas, a partir de partidos terminados publicados por ESPN.",
};

const PLAYER_LIMIT = 300;
const synced = matchesJson as SyncedMatches;

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const { round } = await searchParams;
  const rounds = [...new Set(synced.matches.flatMap((match) => (match.completed && match.round !== null ? [match.round] : [])))].sort((a, b) => a - b);
  const requested = round === undefined ? null : Number(round);
  const selected = requested !== null && rounds.includes(requested) ? requested : null;
  const notice = round !== undefined && selected === null ? `Jornada no válida o sin partidos terminados: "${round}". Se muestran las estadísticas acumuladas.` : null;
  const scope = selected === null ? undefined : { round: selected };

  return (
    <AppShell active="stats">
      <StatsCenter
        round={selected}
        rounds={rounds}
        players={aggregatePlayers(synced.matches, scope).slice(0, PLAYER_LIMIT)}
        teams={aggregateTeams(synced.matches, scope)}
        notice={notice}
        fetchedAt={synced.metadata.fetchedAt}
        matchCount={synced.matches.filter((match) => match.completed).length}
      />
    </AppShell>
  );
}
