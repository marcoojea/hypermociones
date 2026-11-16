import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { buildStandings, estimateStrengths, predictMatch, type MatchResult } from "@/domain/match-model";
import { activeRoundNumber } from "@/domain/segunda-matches";
import { fixtureRepository } from "@/repositories/fixture-repository";

export const metadata: Metadata = {
  title: "Predicciones",
  description: "Probabilidades estimadas, clasificación y resultados de LaLiga Hypermotion 2026/27 a partir de partidos publicados.",
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

export default async function PredictionsPage() {
  const [fixtures, provenance] = await Promise.all([fixtureRepository.findAll(), fixtureRepository.getProvenance()]);

  const finished: MatchResult[] = [];
  for (const fixture of fixtures) {
    if (fixture.status === "FINISHED" && fixture.homeScore !== null && fixture.awayScore !== null) {
      finished.push({ home: fixture.homeTeam.name, away: fixture.awayTeam.name, homeGoals: fixture.homeScore, awayGoals: fixture.awayScore });
    }
  }

  const strengths = estimateStrengths(finished);
  const standings = buildStandings(finished);
  const round = activeRoundNumber(fixtures);
  const nextFixtures = fixtures.filter((fixture) => fixture.status === "SCHEDULED" && fixture.round === round);
  const postponed = fixtures.filter((fixture) => fixture.status === "POSTPONED");
  // Teams with no finished match yet must count as 0 played, or the sample warning stays hidden.
  const playedByTeam = new Map(standings.map((row) => [row.team, row.played]));
  const teamNames = new Set(fixtures.flatMap((fixture) => [fixture.homeTeam.name, fixture.awayTeam.name]));
  const fewestPlayed = teamNames.size > 0 ? Math.min(...[...teamNames].map((team) => playedByTeam.get(team) ?? 0)) : 0;

  return (
    <AppShell active="predictions">
      <section className="page-header">
        <div>
          <p className="eyebrow">Modelo estadístico · {provenance.provider}{provenance.importedAt ? ` · actualizado ${new Date(provenance.importedAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}` : ""}</p>
          <h1>Predicciones</h1>
          <p>Probabilidades estimadas a partir de los resultados publicados. No son datos oficiales ni consejos de apuestas.</p>
        </div>
        <div className="header-stat"><strong>{finished.length}</strong><span>resultados usados</span></div>
      </section>

      {!strengths ? (
        <section className="setup-state"><span>01</span><div><p className="eyebrow">Sin resultados</p><h2>Todavía no hay partidos terminados</h2><p>Las probabilidades aparecerán cuando haya resultados publicados.</p></div></section>
      ) : (
        <>
          <section className="panel">
            <p className="eyebrow">Próxima jornada{round ? ` · ${round}` : ""}</p>
            {nextFixtures.length === 0 ? <p>No hay partidos programados.</p> : nextFixtures.map((fixture) => {
              const prediction = predictMatch(strengths, fixture.homeTeam.name, fixture.awayTeam.name);
              return (
                <article key={fixture.id} className="prediction-row">
                  <h3>{fixture.homeTeam.name} – {fixture.awayTeam.name}</h3>
                  {prediction ? (
                    <>
                      <div className="prob-bar" role="img" aria-label={`Probabilidad local ${percent(prediction.pHome)}, empate ${percent(prediction.pDraw)}, visitante ${percent(prediction.pAway)}`}>
                        <span style={{ flex: prediction.pHome }}>1 · {percent(prediction.pHome)}</span>
                        <span style={{ flex: prediction.pDraw }}>X · {percent(prediction.pDraw)}</span>
                        <span style={{ flex: prediction.pAway }}>2 · {percent(prediction.pAway)}</span>
                      </div>
                      <p>Goles esperados {prediction.expectedHomeGoals.toFixed(1)} – {prediction.expectedAwayGoals.toFixed(1)} · marcador más probable {prediction.mostLikelyScore.home}-{prediction.mostLikelyScore.away} (orientativo)</p>
                    </>
                  ) : <p>Sin datos suficientes para este partido.</p>}
                </article>
              );
            })}
            {fewestPlayed < 5 ? <p className="legal-note">Pocos partidos por equipo ({fewestPlayed} como mínimo): las probabilidades se acercan a la media.</p> : null}
          </section>

          <section className="panel">
            <p className="eyebrow">Clasificación calculada</p>
            <table>
              <thead><tr><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">G</th><th scope="col">E</th><th scope="col">P</th><th scope="col">GF</th><th scope="col">GC</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.team}><th scope="row">{row.team}</th><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.goalDifference}</td><td>{row.points}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {postponed.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">Aplazados</p>
          <ul>{postponed.map((fixture) => <li key={fixture.id}>Jornada {fixture.round ?? "?"}:{fixture.homeTeam.name} – {fixture.awayTeam.name}</li>)}</ul>
        </section>
      ) : null}

      <section className="panel">
        <p className="eyebrow">Noticias</p>
        <h2>Sin fuentes con permiso todavía</h2>
        <p>Las noticias se mostrarán cuando haya fuentes autorizadas.</p>
      </section>
    </AppShell>
  );
}
