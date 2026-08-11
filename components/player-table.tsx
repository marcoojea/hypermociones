import Link from "next/link";
import type { PlayerListItem, PlayerQuery, PlayerSort } from "@/domain/player";

const statusLabels = { AVAILABLE: "Disponible", DOUBTFUL: "Duda", INJURED: "Lesionado", SUSPENDED: "Sancionado", UNKNOWN: "Sin confirmar" } as const;
const metric = (value: number | null, decimals = 0) => value === null ? "—" : value.toFixed(decimals);

function sortHref(query: PlayerQuery, sort: PlayerSort) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.team) params.set("team", query.team);
  if (query.position) params.set("position", query.position);
  if (query.status) params.set("status", query.status);
  params.set("sort", sort);
  params.set("direction", query.sort === sort && query.direction === "desc" ? "asc" : "desc");
  return `/players?${params}`;
}

export function PlayerTable({ players, query }: { players: PlayerListItem[]; query: PlayerQuery }) {
  const heading = (label: string, sort: PlayerSort) => <Link href={sortHref(query, sort)}>{label} {query.sort === sort ? query.direction === "asc" ? "↑" : "↓" : "↕"}</Link>;
  return (
    <div className="table-shell">
      <table>
        <thead><tr><th>Jugador</th><th>Pos.</th><th>Estado</th><th>{heading("Minutos", "minutes")}</th><th>{heading("Puntos", "points")}</th><th>{heading("Forma", "form")}</th><th>{heading("xGI", "xgi")}</th><th>Próximo</th><th>{heading("FIS", "fis")}</th></tr></thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td><Link className="player-cell" href={`/player/${player.slug}`}><span className="team-token" style={{ background: player.team.primaryColor }}>{player.shirtNumber ?? "—"}</span><span><strong>{player.name}</strong><small>{player.team.shortName}{player.age !== null ? ` · ${player.age} años` : ""}</small></span></Link></td>
              <td><span className="position-badge">{player.position}</span></td>
              <td><span className={`status status-${player.status.toLowerCase()}`}><i />{statusLabels[player.status]}</span></td>
              <td className="numeric">{metric(player.minutes)}</td><td className="numeric strong">{metric(player.fantasyPoints)}</td><td className="numeric">{metric(player.form, 1)}</td><td className="numeric">{metric(player.xgi, 2)}</td>
              <td><span className={`difficulty d${player.fixtureDifficulty ?? "x"}`}>{player.nextOpponent ?? "—"}{player.fixtureDifficulty !== null && <b>{player.fixtureDifficulty}</b>}</span></td>
              <td><Link className="fis-cell" href={`/player/${player.slug}`}>{metric(player.fis, 1)}<span>→</span></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {players.length === 0 && <div className="empty-state"><strong>Sin coincidencias</strong><p>Prueba a quitar algún filtro o buscar otro nombre.</p></div>}
    </div>
  );
}
