import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PlayerTable } from "@/components/player-table";
import { playerStatuses, positions, type PlayerQuery, type PlayerSort, type PlayerStatus, type Position, type SortDirection } from "@/domain/player";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Jugadores", description: "Compara jugadores por forma, minutos, xGI y Fantasy Intelligence Score." };

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function parseQuery(raw: RawParams): PlayerQuery {
  const position = first(raw.position);
  const status = first(raw.status);
  const sort = first(raw.sort);
  const direction = first(raw.direction);
  const validSorts: PlayerSort[] = ["name", "fis", "form", "minutes", "xgi", "points"];
  return {
    search: first(raw.search), team: first(raw.team),
    position: positions.includes(position as Position) ? position as Position : undefined,
    status: playerStatuses.includes(status as PlayerStatus) ? status as PlayerStatus : undefined,
    sort: validSorts.includes(sort as PlayerSort) ? sort as PlayerSort : "fis",
    direction: direction === "asc" || direction === "desc" ? direction as SortDirection : "desc",
  };
}

export default async function PlayersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const query = parseQuery(await searchParams);
  const [players, teams, provenance] = await Promise.all([playerRepository.findMany(query), playerRepository.listTeams(), playerRepository.getProvenance()]);
  return (
    <AppShell active="players">
      <section className="page-header"><div><p className="eyebrow">{provenance.mode === "REAL" ? `Datos reales · ${provenance.provider}` : "Base de jugadores · Seed"}</p><h1>Jugadores</h1><p>{provenance.note}</p></div><div className="header-stat"><strong>{players.length}</strong><span>resultados</span></div></section>
      <form className="filters" action="/players" method="get">
        <label className="search-field"><span>⌕</span><input defaultValue={query.search} name="search" placeholder="Buscar jugador o equipo..." /></label>
        <label><span>Equipo</span><select defaultValue={query.team ?? ""} name="team"><option value="">Todos</option>{teams.map((team) => <option key={team.id} value={team.slug}>{team.name}</option>)}</select></label>
        <label><span>Posición</span><select defaultValue={query.position ?? ""} name="position"><option value="">Todas</option>{positions.map((position) => <option key={position}>{position}</option>)}</select></label>
        <label><span>Estado</span><select defaultValue={query.status ?? ""} name="status"><option value="">Todos</option><option value="AVAILABLE">Disponible</option><option value="DOUBTFUL">Duda</option><option value="INJURED">Lesionado</option><option value="SUSPENDED">Sancionado</option><option value="UNKNOWN">Sin confirmar</option></select></label>
        <input type="hidden" name="sort" value={query.sort} /><input type="hidden" name="direction" value={query.direction} />
        <button className="button button-primary" type="submit">Aplicar</button><a className="clear-link" href="/players">Limpiar</a>
      </form>
      <div className="results-meta"><span><i /> {provenance.mode === "REAL" ? `Importado ${provenance.importedAt ? new Date(provenance.importedAt).toLocaleDateString("es-ES") : ""}` : "Datos mock: métricas agregadas de 3 jornadas"}</span><span>Orden: <b>{query.sort}</b> · {query.direction === "desc" ? "mayor a menor" : "menor a mayor"}</span></div>
      <PlayerTable players={players} query={query} />
    </AppShell>
  );
}
