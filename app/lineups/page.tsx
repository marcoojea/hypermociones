import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";
import type { PlayerListItem } from "@/domain/player";

export const metadata: Metadata = { title: "Alineaciones probables", description: "Candidatos y disponibilidad para LaLiga Hypermotion 2026/27." };
const positionOrder = { POR: 0, DEF: 1, MED: 2, DEL: 3 } as const;

function candidates(players: PlayerListItem[]) {
  return [...players].sort((a, b) => {
    const unavailableA = a.status === "INJURED" || a.status === "SUSPENDED" ? 1 : 0;
    const unavailableB = b.status === "INJURED" || b.status === "SUSPENDED" ? 1 : 0;
    return unavailableA - unavailableB || positionOrder[a.position] - positionOrder[b.position]
      || (b.starts ?? 0) - (a.starts ?? 0) || a.name.localeCompare(b.name, "es");
  }).slice(0, 11);
}

function probability(player: PlayerListItem) {
  if (player.status === "INJURED" || player.status === "SUSPENDED") return 0;
  if (player.appearances && player.starts !== null) return Math.round((player.starts / player.appearances) * 100);
  return null;
}

function TeamCandidates({ name, players }: { name: string; players: PlayerListItem[] }) {
  const selected = candidates(players);
  const hasObservedStarts = players.some((player) => (player.appearances ?? 0) > 0);
  return <section className="lineup-team"><div className="lineup-team-heading"><div><span>{hasObservedStarts ? "Once probable" : "Candidatos disponibles"}</span><h3>{name}</h3></div><b>{selected.length}/11</b></div>
    <div className="candidate-list">{selected.map((player) => {
      const chance = probability(player);
      return <a className="candidate" href={`/player/${player.slug}`} key={player.id}>
        <span className={`candidate-chance ${chance === null ? "unknown" : ""}`}>{chance === null ? "s/d" : `${chance}%`}</span>
        <span><strong>{player.name}</strong><small>{player.position} · {player.status === "UNKNOWN" ? "estado por confirmar" : player.status.toLocaleLowerCase("es")}</small></span>
      </a>;
    })}{selected.length === 0 && <p className="lineup-empty">Plantilla todavía no disponible en la fuente gratuita.</p>}</div>
  </section>;
}

export default async function LineupsPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const [{ round }, fixtures, players, provenance] = await Promise.all([
    searchParams, fixtureRepository.findAll(), playerRepository.findMany(), playerRepository.getProvenance(),
  ]);
  const rounds = [...new Set(fixtures.map((fixture) => fixture.round).filter((value): value is number => value !== null))];
  const selectedRound = Number(round) || rounds[0] || 1;
  const matches = fixtures.filter((fixture) => fixture.round === selectedRound);
  const byTeam = new Map<string, PlayerListItem[]>();
  for (const player of players) byTeam.set(player.team.id, [...(byTeam.get(player.team.id) ?? []), player]);

  return <AppShell active="lineups">
    <section className="page-header"><div><p className="eyebrow">Temporada {provenance.season} · {provenance.provider}</p><h1>Alineaciones</h1><p>Candidatos probables según disponibilidad y titularidades observadas.</p></div><div className="header-stat"><strong>J{selectedRound}</strong><span>{matches.length} partidos</span></div></section>
    <nav className="round-selector" aria-label="Seleccionar jornada">{rounds.map((item) => <a className={item === selectedRound ? "active" : ""} href={`/lineups?round=${item}`} key={item}>Jornada {item}</a>)}</nav>
    <p className="lineup-disclaimer"><strong>Cómo leerlo:</strong> “s/d” significa que la RFEF todavía no publica titularidades suficientes para calcular un porcentaje. La plantilla es la mostrada actualmente en la ficha oficial; no se inventa una probabilidad.</p>
    <div className="lineup-matches">{matches.map((fixture) => <article className="lineup-match" key={fixture.id}>
      <header><span>Jornada {fixture.round}</span><strong>{fixture.homeTeam.shortName} <i>vs</i> {fixture.awayTeam.shortName}</strong><small>{new Date(fixture.kickoffAt).toLocaleDateString("es-ES", { day: "numeric", month: "long" })} · hora pendiente</small></header>
      <div className="lineup-grid"><TeamCandidates name={fixture.homeTeam.name} players={byTeam.get(fixture.homeTeam.id) ?? []} /><TeamCandidates name={fixture.awayTeam.name} players={byTeam.get(fixture.awayTeam.id) ?? []} /></div>
    </article>)}</div>
  </AppShell>;
}
