import type { PlayerListItem, PlayerQuery, PlayerSort } from "./player";

const sortValue: Record<PlayerSort, (player: PlayerListItem) => number | string | null> = {
  name: (player) => player.name, fis: (player) => player.fis, form: (player) => player.form,
  minutes: (player) => player.minutes, xgi: (player) => player.xgi, points: (player) => player.fantasyPoints,
};

export function queryPlayers(players: readonly PlayerListItem[], query: PlayerQuery): PlayerListItem[] {
  const search = query.search?.trim().toLocaleLowerCase("es") ?? "";
  const sort = query.sort ?? "fis";
  const direction = query.direction ?? "desc";
  return players
    .filter((player) => !search || `${player.name} ${player.team.name}`.toLocaleLowerCase("es").includes(search))
    .filter((player) => !query.team || player.team.slug === query.team)
    .filter((player) => !query.position || player.position === query.position)
    .filter((player) => !query.status || player.status === query.status)
    .sort((left, right) => {
      const a = sortValue[sort](left); const b = sortValue[sort](right);
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      const comparison = typeof a === "string" && typeof b === "string" ? a.localeCompare(b, "es") : Number(a) - Number(b);
      return direction === "asc" ? comparison : -comparison;
    });
}
