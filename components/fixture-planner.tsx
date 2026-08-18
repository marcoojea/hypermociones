"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { isMyFantasyTeam, myTeamStorageKey, type MyFantasyTeam } from "@/domain/fantasy-team";
import type { FixtureListItem } from "@/domain/fixture";
import { emptyPlanner, isPlannerState, plannerStorageKey, type PlannerState } from "@/domain/planner";
import type { PlayerListItem, TeamSummary } from "@/domain/player";
import { notifyProduct } from "@/domain/product-events";
import { PlayerPicker } from "./player-picker";
import { ShareButton } from "./share-button";
import { useRecommendations } from "./use-recommendations";

export function FixturePlanner({ players, teams, fixtures, rounds }: { players: PlayerListItem[]; teams: TeamSummary[]; fixtures: FixtureListItem[]; rounds: number[] }) {
  const [team, setTeam] = useState<MyFantasyTeam | null>(null);
  const [planner, setPlanner] = useState<PlannerState>(emptyPlanner());
  const [loaded, setLoaded] = useState(false);
  const round = rounds[0] ?? 1;
  const { byPlayer: recommendations } = useRecommendations(players, teams, round);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const rawTeam = localStorage.getItem(myTeamStorageKey);
      if (rawTeam) try { const value: unknown = JSON.parse(rawTeam); if (isMyFantasyTeam(value)) setTeam(value); } catch { /* Keep empty state. */ }
      const rawPlan = localStorage.getItem(plannerStorageKey);
      if (rawPlan) try { const value: unknown = JSON.parse(rawPlan); if (isPlannerState(value)) setPlanner(value); } catch { /* Keep a clean plan. */ }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const save = (next: PlannerState) => {
    const saved = { ...next, updatedAt: new Date().toISOString() };
    setPlanner(saved); localStorage.setItem(plannerStorageKey, JSON.stringify(saved));
  };
  const playerById = new Map(players.map((player) => [player.id, player]));
  const teamFixtures = useMemo(() => {
    const result = new Map<string, Map<number, FixtureListItem>>();
    for (const item of teams) result.set(item.id, new Map());
    for (const fixture of fixtures) if (fixture.round !== null) { result.get(fixture.homeTeam.id)?.set(fixture.round, fixture); result.get(fixture.awayTeam.id)?.set(fixture.round, fixture); }
    return result;
  }, [teams, fixtures]);
  const squad = team?.squad.flatMap((entry) => [playerById.get(entry.playerId)].filter(Boolean) as PlayerListItem[]) ?? [];
  const addScenario = () => {
    if (!squad.length) { notifyProduct("Primero crea tu plantilla.", "warning"); return; }
    if (planner.scenarios.length >= 5) { notifyProduct("Puedes guardar como máximo cinco escenarios.", "warning"); return; }
    save({ ...planner, scenarios: [...planner.scenarios, { id: crypto.randomUUID(), name: `Plan ${planner.scenarios.length + 1}`, outPlayerId: squad[0]?.id ?? null, inPlayerId: null, createdAt: new Date().toISOString() }] });
    notifyProduct("Escenario creado.");
  };
  const updateScenario = (id: string, patch: Partial<PlannerState["scenarios"][number]>) => save({ ...planner, scenarios: planner.scenarios.map((item) => item.id === id ? { ...item, ...patch } : item) });

  if (!loaded) return <section className="setup-state"><span>H</span><div><h2>Preparando planificador</h2></div></section>;

  return <>
    <section className="page-header"><div><p className="eyebrow">Horizonte de cinco jornadas</p><h1>Planificador</h1><p>Visualiza el calendario de tu plantilla y guarda hasta cinco simulaciones de fichaje.</p></div><button className="button button-primary" disabled={!squad.length || planner.scenarios.length >= 5} onClick={addScenario} title={!squad.length ? "Primero crea Mi equipo" : planner.scenarios.length >= 5 ? "Límite de cinco escenarios alcanzado" : undefined} type="button">Nuevo escenario</button></section>
    {!team || !squad.length ? <section className="empty-tool"><strong>Primero crea tu plantilla</strong><p>El planificador utiliza Mi equipo como punto de partida.</p><Link className="button button-primary" href="/my-team">Crear Mi equipo →</Link></section> : <>
      <section className="planner-squad"><header><strong>{team.name}</strong><span>{squad.length} jugadores · J{round}–J{round + 4}</span></header><div className="planner-table"><div className="planner-row planner-head"><span>Jugador</span>{Array.from({ length: 5 }, (_, index) => <b key={index}>J{round + index}</b>)}<b>Tier</b></div>{squad.map((player) => <div className="planner-row" key={player.id}><Link href={`/player/${player.slug}`}><strong>{player.name}</strong><small>{player.position} · {player.team.shortName}</small></Link>{Array.from({ length: 5 }, (_, index) => { const fixture = teamFixtures.get(player.team.id)?.get(round + index); if (!fixture) return <span className="blank" key={index}>—</span>; const home = fixture.homeTeam.id === player.team.id; const opponent = home ? fixture.awayTeam : fixture.homeTeam; return <span key={index}><strong>{opponent.shortName}</strong><small>{home ? "LOC" : "VIS"}</small></span>; })}<em>{recommendations.get(player.id)?.tier ?? "NR"}</em></div>)}</div></section>
      <section className="scenario-grid">{planner.scenarios.map((scenario) => {
        const out = scenario.outPlayerId ? playerById.get(scenario.outPlayerId) : null;
        const incoming = scenario.inPlayerId ? playerById.get(scenario.inPlayerId) : null;
        const delta = incoming && out ? (recommendations.get(incoming.id)?.recommendationScore ?? 0) - (recommendations.get(out.id)?.recommendationScore ?? 0) : null;
        const incomingOptions = players.filter((player) => !team.squad.some((entry) => entry.playerId === player.id) && (!out || player.position === out.position));
        return <article className="panel" key={scenario.id}>
          <input aria-label="Nombre del escenario" className="scenario-name" maxLength={60} onChange={(event) => updateScenario(scenario.id, { name: event.target.value })} value={scenario.name} />
          <PlayerPicker label="Vender" onChange={(value) => updateScenario(scenario.id, { outPlayerId: value || null, inPlayerId: null })} options={squad.map((player) => ({ value: player.id, label: `${player.name} · ${player.team.shortName}`, keywords: player.position }))} value={scenario.outPlayerId ?? ""} />
          <PlayerPicker label="Fichar" onChange={(value) => updateScenario(scenario.id, { inPlayerId: value || null })} options={incomingOptions.map((player) => ({ value: player.id, label: `${player.name} · ${player.team.shortName}`, keywords: `${player.position} ${player.team.name}` }))} value={scenario.inPlayerId ?? ""} />
          <div className="scenario-result"><span>Impacto actual</span><strong>{delta === null ? "Pendiente" : `${delta >= 0 ? "+" : ""}${delta} score`}</strong><small>{incoming ? `Tier ${recommendations.get(incoming.id)?.tier ?? "NR"}` : "Elige un fichaje"}</small></div>
          <div className="scenario-actions"><ShareButton className="button" text={`${scenario.name}: ${out?.name ?? "sin venta"} → ${incoming?.name ?? "sin fichaje"}${delta === null ? "" : `, impacto ${delta >= 0 ? "+" : ""}${delta}`}`} title={scenario.name} /><button className="remove-compare" onClick={() => { save({ ...planner, scenarios: planner.scenarios.filter((item) => item.id !== scenario.id) }); notifyProduct("Escenario eliminado.", "info"); }} type="button">Eliminar escenario</button></div>
        </article>;
      })}</section>
    </>}
  </>;
}
