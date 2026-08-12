"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FixtureListItem } from "@/domain/fixture";
import { formations, lineupStorageKey, type StoredLineup } from "@/domain/lineup";
import type { PlayerListItem, TeamSummary } from "@/domain/player";
import { LineupPitch } from "./lineup-pitch";

const positionOrder = { POR: 0, DEF: 1, MED: 2, DEL: 3 } as const;
const statusLabels = { AVAILABLE: "Disponible", DOUBTFUL: "Duda", INJURED: "Lesionado", SUSPENDED: "Sancionado", UNKNOWN: "Por confirmar" } as const;

function fallbackCandidates(players: PlayerListItem[]) {
  return [...players].sort((a, b) => positionOrder[a.position] - positionOrder[b.position] || a.name.localeCompare(b.name, "es")).slice(0, 11);
}

function TeamLineup({ team, players, lineup, round }: { team: TeamSummary; players: PlayerListItem[]; lineup?: StoredLineup; round: number }) {
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const candidates = fallbackCandidates(players);
  const hasPublishedLineup = lineup && lineup.starters.some((item) => item.playerId) && formations[lineup.formation];
  return <section className="lineup-team public-lineup-team">
    <div className="lineup-team-heading"><div><span>{hasPublishedLineup ? `Once probable · ${lineup.formation}` : "Candidatos RFEF"}</span><h3>{team.name}</h3></div><Link href={`/lineups/editor?team=${team.slug}&round=${round}`}>{hasPublishedLineup ? "Editar" : "Crear"} →</Link></div>
    {hasPublishedLineup ? <>
      <LineupPitch lineup={lineup} players={playerById} compact />
      <div className="published-meta"><span>Actualizada {new Date(lineup.updatedAt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>{lineup.captainId && <strong>Capitán · {playerById.get(lineup.captainId)?.name}</strong>}</div>
      {lineup.substitutes.length > 0 && <div className="published-bench"><small>Alternativas</small>{lineup.substitutes.map((item) => <span key={item.playerId}><b>{item.confidence}%</b>{playerById.get(item.playerId)?.name}</span>)}</div>}
      {lineup.notes && <p className="published-notes">{lineup.notes}</p>}
    </> : <div className="candidate-list">{candidates.map((player) => <Link className="candidate" href={`/player/${player.slug}`} key={player.id}><span className="candidate-chance unknown">s/d</span><span><strong>{player.name}</strong><small>{player.position} · {statusLabels[player.status]}</small></span></Link>)}{candidates.length === 0 && <p className="lineup-empty">Plantilla no disponible.</p>}</div>}
  </section>;
}

export function LineupCenter({ matches, players, teams, rounds, selectedRound }: { matches: FixtureListItem[]; players: PlayerListItem[]; teams: TeamSummary[]; rounds: number[]; selectedRound: number }) {
  const [saved, setSaved] = useState<Record<string, StoredLineup>>({});
  useEffect(() => {
    const lineups: Record<string, StoredLineup> = {};
    for (const team of teams) {
      const raw = localStorage.getItem(lineupStorageKey(team.id, selectedRound));
      if (!raw) continue;
      try { lineups[team.id] = JSON.parse(raw) as StoredLineup; } catch { localStorage.removeItem(lineupStorageKey(team.id, selectedRound)); }
    }
    setSaved(lineups);
  }, [teams, selectedRound]);
  const byTeam = new Map<string, PlayerListItem[]>();
  for (const player of players) byTeam.set(player.team.id, [...(byTeam.get(player.team.id) ?? []), player]);
  const publishedCount = Object.keys(saved).length;

  return <>
    <div className="lineup-actions-row"><nav className="round-selector" aria-label="Seleccionar jornada">{rounds.map((round) => <Link className={round === selectedRound ? "active" : ""} href={`/lineups?round=${round}`} key={round}>Jornada {round}</Link>)}</nav><Link className="button button-primary" href={`/lineups/editor?team=${teams[0]?.slug ?? ""}&round=${selectedRound}`}>Abrir editor →</Link></div>
    <div className="lineup-status-banner"><span><i /> {publishedCount} alineaciones editadas en este dispositivo</span><p>Los equipos sin edición muestran únicamente candidatos de la plantilla RFEF, sin porcentajes inventados.</p></div>
    <div className="lineup-matches">{matches.map((fixture) => <article className="lineup-match" key={fixture.id}>
      <header><span>Jornada {fixture.round}</span><strong>{fixture.homeTeam.shortName} <i>vs</i> {fixture.awayTeam.shortName}</strong><small>{new Date(fixture.kickoffAt).toLocaleDateString("es-ES", { day: "numeric", month: "long" })} · hora pendiente</small></header>
      <div className="lineup-grid"><TeamLineup team={fixture.homeTeam} players={byTeam.get(fixture.homeTeam.id) ?? []} lineup={saved[fixture.homeTeam.id]} round={selectedRound} /><TeamLineup team={fixture.awayTeam} players={byTeam.get(fixture.awayTeam.id) ?? []} lineup={saved[fixture.awayTeam.id]} round={selectedRound} /></div>
    </article>)}</div>
  </>;
}
