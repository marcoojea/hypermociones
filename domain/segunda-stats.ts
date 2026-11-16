import type { SyncMatch, SyncTeamStats } from "../data/espn-segunda-types";
import { normalizePlayerName, sameTeam } from "./espn-soccer";

export interface PlayerTotals {
  teamName: string;
  name: string;
  appearances: number;
  starts: number;
  // Sum of the minutes that are known; null when no completed match gives minutes for the player.
  minutes: number | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  totalShots: number;
  shotsOnTarget: number;
  saves: number;
  goalsConceded: number;
}

export interface TeamTotals {
  teamName: string;
  played: number;
  possessionAvg: number | null;
  totalShots: number | null;
  shotsOnTarget: number | null;
  foulsCommitted: number | null;
  yellowCards: number | null;
  redCards: number | null;
  wonCorners: number | null;
  saves: number | null;
  offsides: number | null;
}

export interface DisciplineStatus {
  yellowCards: number;
  redCardLastMatch: boolean;
  suspendedNextMatch: boolean;
  reason: string | null;
}

const completedMatches = (matches: SyncMatch[], options?: { round?: number }) =>
  matches.filter((match) => match.completed && (options?.round === undefined || match.round === options.round));

export function aggregatePlayers(matches: SyncMatch[], options?: { round?: number }): PlayerTotals[] {
  const byKey = new Map<string, PlayerTotals>();
  for (const match of completedMatches(matches, options)) {
    for (const player of match.players) {
      const key = `${player.teamName}|${normalizePlayerName(player.name)}`;
      const total = byKey.get(key) ?? {
        teamName: player.teamName, name: player.name, appearances: 0, starts: 0, minutes: null, goals: 0, assists: 0,
        yellowCards: 0, redCards: 0, totalShots: 0, shotsOnTarget: 0, saves: 0, goalsConceded: 0,
      };
      total.appearances += player.appearances;
      if (player.starter) total.starts += 1;
      if (player.minutes !== null) total.minutes = (total.minutes ?? 0) + player.minutes;
      total.goals += player.goals;
      total.assists += player.assists;
      total.yellowCards += player.yellowCards;
      total.redCards += player.redCards;
      total.totalShots += player.totalShots;
      total.shotsOnTarget += player.shotsOnTarget;
      total.saves += player.saves;
      total.goalsConceded += player.goalsConceded;
      byKey.set(key, total);
    }
  }
  return [...byKey.values()].sort((a, b) =>
    b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name) || a.teamName.localeCompare(b.teamName));
}

// Only non-null values count; a field that is null in every match stays null.
const known = (stats: SyncTeamStats[], pick: (stat: SyncTeamStats) => number | null) =>
  stats.map(pick).filter((value): value is number => value !== null);
const sumOrNull = (values: number[]) => (values.length > 0 ? values.reduce((total, value) => total + value, 0) : null);
const meanOrNull = (values: number[]) => (values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null);

export function aggregateTeams(matches: SyncMatch[], options?: { round?: number }): TeamTotals[] {
  const sides = new Map<string, { played: number; stats: SyncTeamStats[] }>();
  for (const match of completedMatches(matches, options)) {
    const entries = [{ name: match.home.name, stats: match.teamStats.home }, { name: match.away.name, stats: match.teamStats.away }];
    for (const entry of entries) {
      const side = sides.get(entry.name) ?? { played: 0, stats: [] };
      side.played += 1;
      if (entry.stats) side.stats.push(entry.stats);
      sides.set(entry.name, side);
    }
  }
  return [...sides].map(([teamName, { played, stats }]) => ({
    teamName,
    played,
    possessionAvg: meanOrNull(known(stats, (stat) => stat.possessionPct)),
    totalShots: sumOrNull(known(stats, (stat) => stat.totalShots)),
    shotsOnTarget: sumOrNull(known(stats, (stat) => stat.shotsOnTarget)),
    foulsCommitted: sumOrNull(known(stats, (stat) => stat.foulsCommitted)),
    yellowCards: sumOrNull(known(stats, (stat) => stat.yellowCards)),
    redCards: sumOrNull(known(stats, (stat) => stat.redCards)),
    wonCorners: sumOrNull(known(stats, (stat) => stat.wonCorners)),
    saves: sumOrNull(known(stats, (stat) => stat.saves)),
    offsides: sumOrNull(known(stats, (stat) => stat.offsides)),
  })).sort((a, b) => a.teamName.localeCompare(b.teamName));
}

// APPROXIMATE: simplified rule. Suspended next match when the player got a red card in the team's latest
// completed match, or when his yellow total is a multiple of 5 and the latest completed match added a yellow.
// Real competition rules (cup cards, long bans, rulings after appeals) are not modelled.
export function disciplineStatus(matches: SyncMatch[], teamName: string, playerName: string): DisciplineStatus {
  const key = normalizePlayerName(playerName);
  const teamMatches = matches
    .filter((match) => match.completed && (sameTeam(match.home.name, teamName) || sameTeam(match.away.name, teamName)))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || Number(a.espnId) - Number(b.espnId));
  const perMatch = teamMatches.map((match) => {
    const rows = match.players.filter((player) => sameTeam(player.teamName, teamName) && normalizePlayerName(player.name) === key);
    return {
      yellows: rows.reduce((total, row) => total + row.yellowCards, 0),
      reds: rows.reduce((total, row) => total + row.redCards, 0),
    };
  });
  const yellowCards = perMatch.reduce((total, match) => total + match.yellows, 0);
  const latest = perMatch.at(-1) ?? { yellows: 0, reds: 0 };
  const redCardLastMatch = latest.reds > 0;
  const fifthYellow = yellowCards > 0 && yellowCards % 5 === 0 && latest.yellows > 0;
  return {
    yellowCards,
    redCardLastMatch,
    suspendedNextMatch: redCardLastMatch || fifthYellow,
    reason: redCardLastMatch ? "roja en la última jornada" : fifthYellow ? "5 amarillas acumuladas" : null,
  };
}
