export interface MatchResult {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TeamStrength {
  attack: number;
  defense: number;
}

export interface Strengths {
  goalsPerTeamMatch: number;
  homeAdvantage: number;
  teams: Record<string, TeamStrength>;
}

export interface MatchPrediction {
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  pHome: number;
  pDraw: number;
  pAway: number;
  mostLikelyScore: { home: number; away: number; p: number };
}

// Pulls small samples toward 1 so one match cannot make a team look elite.
const SHRINKAGE_MATCHES = 5;

const shrink = (played: number, raw: number) => (played * raw + SHRINKAGE_MATCHES) / (played + SHRINKAGE_MATCHES);

export function buildStandings(matches: MatchResult[]): StandingRow[] {
  const table = new Map<string, StandingRow>();
  const rowFor = (team: string) => {
    let row = table.get(team);
    if (!row) {
      row = { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
      table.set(team, row);
    }
    return row;
  };
  for (const match of matches) {
    const home = rowFor(match.home);
    const away = rowFor(match.away);
    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;
    if (match.homeGoals > match.awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeGoals < match.awayGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      home.points += 1;
      away.drawn += 1;
      away.points += 1;
    }
  }
  return [...table.values()]
    .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team));
}

export function estimateStrengths(finished: MatchResult[]): Strengths | null {
  if (finished.length === 0) return null;
  const totalHome = finished.reduce((sum, match) => sum + match.homeGoals, 0);
  const totalGoals = finished.reduce((sum, match) => sum + match.homeGoals + match.awayGoals, 0);
  const goalsPerTeamMatch = totalGoals / (finished.length * 2);
  // With no goals at all there is no basis for a ratio model.
  if (goalsPerTeamMatch === 0) return null;

  const totals = new Map<string, { played: number; goalsFor: number; goalsAgainst: number }>();
  const add = (team: string, goalsFor: number, goalsAgainst: number) => {
    const entry = totals.get(team) ?? { played: 0, goalsFor: 0, goalsAgainst: 0 };
    entry.played += 1;
    entry.goalsFor += goalsFor;
    entry.goalsAgainst += goalsAgainst;
    totals.set(team, entry);
  };
  for (const match of finished) {
    add(match.home, match.homeGoals, match.awayGoals);
    add(match.away, match.awayGoals, match.homeGoals);
  }

  const teams: Record<string, TeamStrength> = {};
  for (const [team, entry] of totals) {
    teams[team] = {
      attack: shrink(entry.played, entry.goalsFor / entry.played / goalsPerTeamMatch),
      defense: shrink(entry.played, entry.goalsAgainst / entry.played / goalsPerTeamMatch),
    };
  }
  return {
    goalsPerTeamMatch,
    // Shrunk like team ratios: one 0-1 result must not make home teams score zero.
    homeAdvantage: shrink(finished.length, totalHome / finished.length / goalsPerTeamMatch),
    teams,
  };
}

const poissonWeights = (lambda: number, maxGoals: number) => {
  const weights = [Math.exp(-lambda)];
  for (let k = 1; k <= maxGoals; k += 1) weights.push((weights[k - 1] * lambda) / k);
  return weights;
};

export function predictMatch(strengths: Strengths | null, home: string, away: string, maxGoals = 8): MatchPrediction | null {
  if (!strengths) return null;
  const hasTeam = (team: string) => Object.prototype.hasOwnProperty.call(strengths.teams, team);
  if (!hasTeam(home) || !hasTeam(away)) return null;
  const h = strengths.teams[home];
  const a = strengths.teams[away];

  const lambdaHome = strengths.goalsPerTeamMatch * h.attack * a.defense * strengths.homeAdvantage;
  const lambdaAway = strengths.goalsPerTeamMatch * a.attack * h.defense;
  const homeWeights = poissonWeights(lambdaHome, maxGoals);
  const awayWeights = poissonWeights(lambdaAway, maxGoals);

  let total = 0;
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let best = { home: 0, away: 0, p: -1 };
  for (let i = 0; i <= maxGoals; i += 1) {
    for (let j = 0; j <= maxGoals; j += 1) {
      const p = homeWeights[i] * awayWeights[j];
      total += p;
      if (i > j) pHome += p;
      else if (i === j) pDraw += p;
      else pAway += p;
      if (p > best.p) best = { home: i, away: j, p };
    }
  }
  return {
    expectedHomeGoals: lambdaHome,
    expectedAwayGoals: lambdaAway,
    pHome: pHome / total,
    pDraw: pDraw / total,
    pAway: pAway / total,
    mostLikelyScore: { home: best.home, away: best.away, p: best.p / total },
  };
}
