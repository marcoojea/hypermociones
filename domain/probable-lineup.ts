import { normalizePlayerName, resolveLineupStatuses, samePlayer, type LineupStatus } from "./espn-soccer";

export type ProbableReason = "XI_ANTERIOR" | "SUSTITUTO_BANCO" | "ESTIMACION_HISTORICA";

export interface ProbablePlayer {
  playerId: string;
  name: string;
  reason: ProbableReason;
}

export interface ProbableLineup {
  xi: ProbablePlayer[];
  bench: ProbablePlayer[];
  source: "XI_ANTERIOR" | "ESTIMACION_HISTORICA";
  // ESPN names that could not be matched to the squad. Non-empty means the last XI was not used.
  unresolved: string[];
}

export interface ProbableXiInput {
  teamName: string;
  lastXi: string[] | null;
  lastBench: string[];
  squad: Array<{ id: string; name: string; historicalProbability: number | null }>;
  unavailableNames: string[];
}

const XI_SIZE = 11;
const BENCH_SIZE = 7;

type Candidate = { player: ProbableXiInput["squad"][number]; reason: ProbableReason };

// Null probabilities sort last; ties go by name so the result is stable.
const byHistory = (a: ProbableXiInput["squad"][number], b: ProbableXiInput["squad"][number]) => {
  const pa = a.historicalProbability ?? -Infinity;
  const pb = b.historicalProbability ?? -Infinity;
  return pb - pa || a.name.localeCompare(b.name);
};

// The first 11 candidates play, the next 7 sit on the bench.
const split = (ordered: Candidate[]) => {
  const toPlayer = ({ player, reason }: Candidate): ProbablePlayer => ({ playerId: player.id, name: player.name, reason });
  return {
    xi: ordered.slice(0, XI_SIZE).map(toPlayer),
    bench: ordered.slice(XI_SIZE, XI_SIZE + BENCH_SIZE).map(toPlayer),
  };
};

export function probableXi(input: ProbableXiInput): ProbableLineup {
  const available = input.squad.filter((player) => !input.unavailableNames.some((name) => samePlayer(name, player.name)));
  const historical: Candidate[] = [...available].sort(byHistory).map((player) => ({ player, reason: "ESTIMACION_HISTORICA" }));

  if (input.lastXi === null) {
    return { ...split(historical), source: "ESTIMACION_HISTORICA", unresolved: [] };
  }

  // Statuses are resolved against the whole squad so an injured starter still maps to his slot.
  const resolved = resolveLineupStatuses(input.squad.map((player) => player.name), {
    teamName: input.teamName,
    starters: input.lastXi,
    bench: input.lastBench,
  });
  if (resolved.unresolved.length > 0) {
    return { ...split(historical), source: "ESTIMACION_HISTORICA", unresolved: resolved.unresolved };
  }

  const statusById = new Map<string, LineupStatus | null>(
    input.squad.map((player, index): [string, LineupStatus | null] => [player.id, resolved.statuses[index]]),
  );
  const withStatus = (status: LineupStatus): Candidate[] =>
    available.filter((player) => statusById.get(player.id) === status).map((player) => ({
      player,
      reason: status === "STARTER" ? "XI_ANTERIOR" : "SUSTITUTO_BANCO",
    }));
  const ordered: Candidate[] = [
    ...withStatus("STARTER"),
    ...withStatus("BENCH"),
    ...historical.filter((candidate) => {
      const status = statusById.get(candidate.player.id);
      return status !== "STARTER" && status !== "BENCH";
    }),
  ];
  return { ...split(ordered), source: "XI_ANTERIOR", unresolved: [] };
}

export interface EspnRosterPlayer {
  espnId: string;
  name: string;
  starts: number;
  minutes: number;
}

export interface ProbableEspnInput {
  teamName: string;
  // ESPN displayNames of the last published XI and its bench; same source as the roster.
  lastXi: string[] | null;
  lastBench: string[];
  roster: EspnRosterPlayer[];
  // ESPN displayNames of injured or suspended players.
  unavailableNames: string[];
}

const byRanking = (a: EspnRosterPlayer, b: EspnRosterPlayer) => b.starts - a.starts || b.minutes - a.minutes || a.name.localeCompare(b.name);
const tag = (players: EspnRosterPlayer[], reason: ProbableReason) => players.map((player) => ({ player, reason }));

// Normalized equality only. Returns the roster players in name order, plus the names not on the roster.
function resolveNames(roster: EspnRosterPlayer[], names: string[]) {
  const found: EspnRosterPlayer[] = [];
  const missing: string[] = [];
  for (const name of names) {
    const player = roster.find((item) => normalizePlayerName(item.name) === normalizePlayerName(name));
    if (!player) missing.push(name);
    else if (!found.includes(player)) found.push(player);
  }
  return { found, missing };
}

// Last XI is used only when every name resolves and its available starters plus available bench fill 11 places.
// Otherwise the XI starts from the available last-XI names and is filled by ranking.
export function probableXiFromEspn(input: ProbableEspnInput): ProbableLineup {
  const unavailable = new Set(input.unavailableNames.map(normalizePlayerName));
  const available = input.roster.filter((player) => !unavailable.has(normalizePlayerName(player.name)));
  const last = resolveNames(input.roster, input.lastXi ?? []);
  const lastXiAvailable = last.found.filter((player) => available.includes(player));
  const benchAvailable = resolveNames(input.roster, input.lastBench).found
    .filter((player) => available.includes(player) && !lastXiAvailable.includes(player));
  const rankedExcept = (taken: EspnRosterPlayer[]) => available.filter((player) => !taken.includes(player)).sort(byRanking);

  const useLastXi = input.lastXi !== null && last.missing.length === 0 && lastXiAvailable.length + benchAvailable.length >= XI_SIZE;
  const tagged = useLastXi
    ? [
      ...tag(lastXiAvailable, "XI_ANTERIOR"),
      ...tag(benchAvailable, "SUSTITUTO_BANCO"),
      ...tag(rankedExcept([...lastXiAvailable, ...benchAvailable]), "ESTIMACION_HISTORICA"),
    ]
    : [...tag(lastXiAvailable, "ESTIMACION_HISTORICA"), ...tag(rankedExcept(lastXiAvailable), "ESTIMACION_HISTORICA")];
  const toPlayer = ({ player, reason }: { player: EspnRosterPlayer; reason: ProbableReason }): ProbablePlayer => ({ playerId: player.espnId, name: player.name, reason });
  return {
    xi: tagged.slice(0, XI_SIZE).map(toPlayer),
    bench: tagged.slice(XI_SIZE, XI_SIZE + BENCH_SIZE).map(toPlayer),
    source: useLastXi ? "XI_ANTERIOR" : "ESTIMACION_HISTORICA",
    unresolved: last.missing,
  };
}
