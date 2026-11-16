"use client";

import Link from "next/link";
import type { PlayerTotals, TeamTotals } from "@/domain/segunda-stats";

const stamp = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
// Null means ESPN did not publish the value; it is never shown as 0.
const show = (value: number | null) => (value === null ? "–" : String(value));
const average = (value: number | null) => (value === null ? "–" : value.toFixed(1));

export function StatsCenter({ round, rounds, players, teams, notice, fetchedAt, matchCount }: {
  round: number | null;
  rounds: number[];
  players: PlayerTotals[];
  teams: TeamTotals[];
  notice: string | null;
  fetchedAt: string;
  matchCount: number;
}) {
  const scope = round === null ? "Acumulado" : `Jornada ${round}`;
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">Estadísticas · {scope}</p>
          <h1>Estadísticas</h1>
          <p>Totales de jugadores y equipos a partir de los partidos terminados publicados por ESPN. Un dato que no se publicó aparece como &quot;–&quot;.</p>
        </div>
        <div className="header-stat"><strong>{matchCount}</strong><span>partidos terminados</span></div>
      </section>

      {notice ? <p className="legal-note" role="status">{notice}</p> : null}
      <nav className="stats-rounds" aria-label="Filtrar por jornada">
        <Link aria-current={round === null ? "page" : undefined} href="/stats">Acumulado</Link>
        {rounds.map((item) => (
          <Link aria-current={round === item ? "page" : undefined} href={`/stats?round=${item}`} key={item} title={`Jornada ${item}`}>J{item}</Link>
        ))}
      </nav>

      {players.length === 0 ? (
        <section className="setup-state"><span>01</span><div><p className="eyebrow">Sin datos</p><h2>Todavía no hay partidos terminados</h2><p>Las estadísticas aparecerán cuando ESPN publique resultados.</p></div></section>
      ) : (
        <>
          <div className="data-heading"><h2>Jugadores</h2><span>Top 300 por goles y asistencias · {scope}</span></div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th scope="col">Equipo</th><th scope="col">Jugador</th><th scope="col">PJ</th><th scope="col">Tit.</th><th scope="col">Min</th>
                  <th scope="col">G</th><th scope="col">A</th><th scope="col">TA</th><th scope="col">TR</th><th scope="col">Tiros</th><th scope="col">Tiros a puerta</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={`${player.teamName}|${player.name}`}>
                    <td>{player.teamName}</td>
                    <th scope="row">{player.name}</th>
                    <td>{show(player.appearances)}</td>
                    <td>{show(player.starts)}</td>
                    <td>{show(player.minutes)}</td>
                    <td>{show(player.goals)}</td>
                    <td>{show(player.assists)}</td>
                    <td>{show(player.yellowCards)}</td>
                    <td>{show(player.redCards)}</td>
                    <td>{show(player.totalShots)}</td>
                    <td>{show(player.shotsOnTarget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="data-heading"><h2>Equipos</h2><span>{scope}</span></div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">Posesión media (%)</th><th scope="col">Tiros</th>
                  <th scope="col">Tiros a puerta</th><th scope="col">Faltas</th><th scope="col">TA</th><th scope="col">TR</th><th scope="col">Córners</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.teamName}>
                    <th scope="row">{team.teamName}</th>
                    <td>{show(team.played)}</td>
                    <td>{average(team.possessionAvg)}</td>
                    <td>{show(team.totalShots)}</td>
                    <td>{show(team.shotsOnTarget)}</td>
                    <td>{show(team.foulsCommitted)}</td>
                    <td>{show(team.yellowCards)}</td>
                    <td>{show(team.redCards)}</td>
                    <td>{show(team.wonCorners)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="legal-note">Fuente: ESPN (API no oficial). Datos de {stamp(fetchedAt)}.</p>
    </>
  );
}
