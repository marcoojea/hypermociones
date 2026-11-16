"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { probabilityFromLineup, resolveLineupStatuses, sameTeam, type EspnScoreboardMatch, type EspnSummary, type LineupStatus } from "@/domain/espn-soccer";

export interface SquadPlayer {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  position: string;
  shirtNumber: number | null;
  historicalProbability: number | null;
  appearances: number | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
}

export interface SquadFixture {
  id: string;
  round: number | null;
  kickoffAt: string;
  status: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface LiveMatch extends EspnScoreboardMatch { summary: EspnSummary | null; summaryAt: string | null; error: string | null }
interface LiveResponse { status: "OK" | "UNAVAILABLE"; fetchedAt: string; source: string; message?: string; errors?: string[]; matches: LiveMatch[] }

const POLL_MS = 30_000;
const FETCH_TIMEOUT_MS = 10_000;
const LINEUP_LABEL: Record<LineupStatus, string> = { STARTER: "Titular confirmado", BENCH: "Banquillo", NOT_LISTED: "No convocado" };
const clock = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

interface Row { player: SquadPlayer; probability: number | null; source: string }

// Every row says why it shows what it shows: confirmed XI, history, or a visible reason it cannot be confirmed.
function sideRows(players: SquadPlayer[], side: "home" | "away", match: LiveMatch | undefined, matched: boolean): Row[] {
  const lineup = match?.summary?.lineups[side] ?? null;
  const resolved = resolveLineupStatuses(players.map((player) => player.name), lineup);
  const rows: Row[] = players.map((player, index) => {
    if (resolved.unresolved.length > 0) return { player, probability: null, source: "Nombres sin casar con ESPN" };
    const status = resolved.statuses[index];
    if (status) return { player, probability: probabilityFromLineup(status), source: LINEUP_LABEL[status] };
    const reason = !matched ? "sin partido en ESPN" : match?.error ? "directo no disponible" : !match?.summary ? "once aún no publicado" : "once no publicado";
    return { player, probability: player.historicalProbability, source: `Histórica 2025/26 · ${reason}` };
  });
  return rows.sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1) || a.player.name.localeCompare(b.player.name, "es"));
}

export function SquadsCenter({ round, rounds, fixtures, squads, notice }: { round: number; rounds: number[]; fixtures: SquadFixture[]; squads: SquadPlayer[]; notice: string | null }) {
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/live-matches", { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        const body = (await response.json()) as LiveResponse;
        if (!active) return;
        setLive(body);
        setLiveError(response.ok && body.status === "OK" ? null : body.message ?? `HTTP ${response.status}`);
      } catch (error) {
        // Keep the last data visible, but mark it as not live.
        if (active) setLiveError(error instanceof Error && error.name === "TimeoutError" ? "El directo no respondió a tiempo." : "No se pudo consultar el directo.");
      }
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const matchFor = (fixture: SquadFixture) => live?.matches.find((item) => sameTeam(item.home.name, fixture.homeTeamName) && sameTeam(item.away.name, fixture.awayTeamName));
  const matchedCount = fixtures.filter((fixture) => matchFor(fixture)).length;
  const liveOk = live?.status === "OK" && liveError === null && matchedCount > 0;
  const previous = rounds.filter((item) => item < round).at(-1);
  const next = rounds.find((item) => item > round);
  const errors = live?.errors ?? [];

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">Plantillas · Jornada {round}</p>
          <h1>Probabilidad de jugar</h1>
          <p>Titular confirmado cuando ESPN publica el once y todos los nombres casan; antes, la estimación histórica de 2025/26. El directo se pide cada 30 segundos.</p>
        </div>
        <div className="header-stat">
          <strong>{liveOk ? "En vivo" : "Histórico"}</strong>
          <span>{live ? `Dato de ${new Date(live.fetchedAt).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid" })}` : "Conectando"}</span>
        </div>
      </section>

      {notice ? <p className="legal-note" role="status">{notice}</p> : null}
      {!liveOk ? (
        <p className="legal-note" role="status">
          {liveError ?? live?.message ?? "Conectando con el directo."}
          {live && matchedCount === 0 && liveError === null ? " Ningún partido de esta jornada aparece en ESPN." : ""}
          {" "}Fuente: {live?.source ?? "ESPN (API no oficial)"}.
        </p>
      ) : null}
      {errors.length > 0 ? <p className="legal-note" role="status">Marcadores no leídos: {errors.join(" · ")}</p> : null}

      <nav className="round-nav" aria-label="Cambiar jornada">
        {previous ? <Link href={`/squads?round=${previous}`}>← Jornada {previous}</Link> : <span />}
        {next ? <Link href={`/squads?round=${next}`}>Jornada {next} →</Link> : null}
      </nav>

      {fixtures.length === 0 ? (
        <section className="setup-state"><span>01</span><div><p className="eyebrow">Sin partidos</p><h2>No hay partidos en esta jornada</h2></div></section>
      ) : fixtures.map((fixture) => {
        const match = matchFor(fixture);
        const home = sideRows(squads.filter((player) => player.teamId === fixture.homeTeamId), "home", match, Boolean(match));
        const away = sideRows(squads.filter((player) => player.teamId === fixture.awayTeamId), "away", match, Boolean(match));
        const bothScores = fixture.homeScore !== null && fixture.awayScore !== null;
        const score = match && match.home.score !== null && match.away.score !== null
          ? `${match.home.score} – ${match.away.score}`
          : bothScores ? `${fixture.homeScore} – ${fixture.awayScore}` : "vs";
        const state = match?.state === "in" ? `En juego · ${match.clock ?? ""}` : match?.state === "post" ? "Final" : clock(fixture.kickoffAt);
        const reason = !live ? null : !match ? "Sin partido en ESPN: solo probabilidades históricas" : match.error ? `Directo no disponible: ${match.error}` : null;
        const events = (match?.summary?.events ?? []).slice(0, 15);
        return (
          <section className="panel squad-match" key={fixture.id}>
            <p className="eyebrow">{state}</p>
            <h2>{fixture.homeTeamName} <span className="squad-score">{score}</span> {fixture.awayTeamName}</h2>
            {reason ? <p className="legal-note">{reason}</p> : null}
            {events.length > 0 ? (
              <ul className="squad-events" aria-label="Eventos del partido">
                {events.map((event, index) => <li key={index}><strong>{event.minute ?? ""}</strong> {event.scoring ? "⚽ " : ""}{event.text}</li>)}
              </ul>
            ) : null}
            {[{ label: fixture.homeTeamName, rows: home }, { label: fixture.awayTeamName, rows: away }].map((side) => (
              <details key={side.label} className="squad-team">
                <summary>{side.label} · {side.rows.length} jugadores</summary>
                <div className="table-shell">
                  <table>
                    <thead><tr><th scope="col">Jugador</th><th scope="col">Pos</th><th scope="col">Prob.</th><th scope="col">Fuente</th><th scope="col">PJ</th><th scope="col">Tit.</th><th scope="col">Min</th><th scope="col">G</th><th scope="col">A</th></tr></thead>
                    <tbody>
                      {side.rows.map(({ player, probability, source }) => (
                        <tr key={player.id}>
                          <th scope="row">{player.shirtNumber ? `${player.shirtNumber} · ` : ""}{player.name}</th>
                          <td>{player.position}</td>
                          <td>{probability === null ? "NR" : `${probability}%`}</td>
                          <td>{source}</td>
                          <td>{player.appearances ?? "–"}</td>
                          <td>{player.starts ?? "–"}</td>
                          <td>{player.minutes ?? "–"}</td>
                          <td>{player.goals ?? "–"}</td>
                          <td>{player.assists ?? "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </section>
        );
      })}
    </>
  );
}
