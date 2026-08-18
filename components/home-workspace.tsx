"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { availabilityStorageKey, effectivePlayerStatus, parseAvailabilityRecords } from "@/domain/availability";
import { emptyFantasyTeam, isMyFantasyTeam, myTeamStorageKey, type MyFantasyTeam } from "@/domain/fantasy-team";
import type { FixtureListItem } from "@/domain/fixture";
import { formationCodes, type FormationCode } from "@/domain/lineup";
import type { PlayerListItem } from "@/domain/player";
import { onboardingStorageKey } from "@/domain/preferences";
import { notifyProduct } from "@/domain/product-events";
import { ShareButton } from "@/components/share-button";

const starterCounts = { POR: 2, DEF: 5, MED: 5, DEL: 3 } as const;

export function HomeWorkspace({ players, fixtures }: { players: PlayerListItem[]; fixtures: FixtureListItem[] }) {
  const [loaded, setLoaded] = useState(false);
  const [team, setTeam] = useState<MyFantasyTeam | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("Mi equipo");
  const [round, setRound] = useState(fixtures.find((fixture) => fixture.round !== null)?.round ?? 1);
  const [formation, setFormation] = useState<FormationCode>("4-3-3");
  const [budget, setBudget] = useState(100);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const raw = localStorage.getItem(myTeamStorageKey);
      if (raw) try { const parsed: unknown = JSON.parse(raw); if (isMyFantasyTeam(parsed)) setTeam(parsed); } catch { /* Present onboarding. */ }
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const statusById = useMemo(() => {
    if (!team || typeof window === "undefined") return new Map();
    return new Map(parseAvailabilityRecords(localStorage.getItem(availabilityStorageKey(team.round)), team.round).map((record) => [record.playerId, record]));
  }, [team]);
  const squad = team?.squad.flatMap((entry) => { const player = playerById.get(entry.playerId); return player ? [{ player, entry, status: effectivePlayerStatus(player, statusById) }] : []; }) ?? [];
  const unavailable = squad.filter(({ status }) => status === "INJURED" || status === "SUSPENDED" || status === "DOUBTFUL");
  const lowChance = squad.filter(({ entry, status }) => entry.startingChance < 60 && status === "AVAILABLE");
  const missingProjections = squad.filter(({ entry }) => entry.projectedPoints === null).length;
  const fixtureByTeam = useMemo(() => {
    const result = new Map<string, FixtureListItem>();
    for (const fixture of fixtures) for (const side of [fixture.homeTeam, fixture.awayTeam]) if (!result.has(side.id)) result.set(side.id, fixture);
    return result;
  }, [fixtures]);

  const completeOnboarding = (withStarterSquad: boolean) => {
    const created = emptyFantasyTeam(round);
    created.name = name.trim() || "Mi equipo";
    created.formation = formation;
    created.budget = Number.isFinite(budget) && budget >= 0 ? budget : null;
    if (withStarterSquad) created.squad = buildStarterSquad(players);
    created.updatedAt = new Date().toISOString();
    localStorage.setItem(myTeamStorageKey, JSON.stringify(created));
    localStorage.setItem(onboardingStorageKey, JSON.stringify({ version: 1, completed: true, completedAt: new Date().toISOString() }));
    setTeam(created);
    notifyProduct(withStarterSquad ? "Espacio preparado con una plantilla de ejemplo." : "Espacio preparado para crear tu plantilla.");
  };

  if (!loaded) return <section className="workspace-loading"><span>H</span><p>Preparando tu centro de jornada…</p></section>;

  if (!team) return <section className="guided-onboarding" aria-labelledby="guided-title">
    <header><div><p className="eyebrow">Configuración inicial · paso {step} de 3</p><h2 id="guided-title">Prepara tu espacio Fantasy.</h2><p>En menos de un minuto tendrás una plantilla y un panel adaptado a tu jornada.</p></div><ol aria-label="Progreso"><li className={step >= 1 ? "done" : ""}>Equipo</li><li className={step >= 2 ? "done" : ""}>Reglas</li><li className={step >= 3 ? "done" : ""}>Plantilla</li></ol></header>
    {step === 1 && <div className="onboarding-form"><label><span>Nombre de tu equipo</span><input maxLength={80} onChange={(event) => setName(event.target.value)} value={name} /></label><label><span>Jornada inicial</span><select onChange={(event) => setRound(Number(event.target.value))} value={round}>{[...new Set(fixtures.flatMap((fixture) => fixture.round ?? []))].map((item) => <option key={item} value={item}>Jornada {item}</option>)}</select></label></div>}
    {step === 2 && <div className="onboarding-form"><label><span>Formación preferida</span><select onChange={(event) => setFormation(event.target.value as FormationCode)} value={formation}>{formationCodes.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Presupuesto (millones)</span><input min={0} onChange={(event) => setBudget(Number(event.target.value))} step="0.1" type="number" value={budget} /></label></div>}
    {step === 3 && <div className="onboarding-choice"><article><span>Recomendado</span><h3>Empezar con ejemplo</h3><p>Carga 15 jugadores equilibrados para explorar alertas, optimizador y planificación.</p><button className="button button-primary" onClick={() => completeOnboarding(true)} type="button">Preparar plantilla de ejemplo</button></article><article><h3>Empezar desde cero</h3><p>Crea la configuración y añade personalmente todos tus jugadores.</p><button className="button" onClick={() => completeOnboarding(false)} type="button">Crear plantilla vacía</button></article></div>}
    <footer><button className="button" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))} type="button">Anterior</button>{step < 3 && <button className="button button-primary" disabled={step === 1 && name.trim().length < 2} onClick={() => setStep((current) => Math.min(3, current + 1))} type="button">Continuar</button>}</footer>
  </section>;

  const tasks = [
    { count: Math.max(0, team.rules.squadSize - squad.length), label: "huecos en plantilla", href: "/my-team", tone: squad.length < 11 ? "warning" : "neutral" },
    { count: unavailable.length, label: "estados a revisar", href: "/availability", tone: unavailable.length ? "danger" : "neutral" },
    { count: lowChance.length, label: "titularidades bajas", href: "/my-team", tone: lowChance.length ? "warning" : "neutral" },
    { count: missingProjections, label: "proyecciones pendientes", href: "/my-team", tone: missingProjections ? "neutral" : "success" },
  ];
  const summary = `${team.name}: ${squad.length} jugadores, ${unavailable.length} estados a revisar y ${lowChance.length} titularidades bajas para la J${team.round}.`;

  return <section className="personal-command-center" aria-labelledby="command-title">
    <header><div><p className="eyebrow">Tu centro de jornada · J{team.round}</p><h2 id="command-title">{team.name}, esto requiere tu atención.</h2><p>Prioridades calculadas únicamente con tu plantilla y los datos disponibles.</p></div><div><ShareButton className="button" text={summary} title={`Resumen de ${team.name}`} /><Link className="button button-primary" href="/gameweek">Abrir jornada completa →</Link></div></header>
    <div className="command-kpis">{tasks.map((task) => <Link className={`command-kpi kpi-${task.tone}`} href={task.href} key={task.label}><strong>{task.count}</strong><span>{task.label}</span><small>Revisar →</small></Link>)}</div>
    <div className="command-layout"><section><div className="section-heading"><div><p className="eyebrow">Alertas prioritarias</p><h3>Decisiones antes del cierre</h3></div></div>{[...unavailable, ...lowChance].slice(0, 6).map(({ player, entry, status }) => { const fixture = fixtureByTeam.get(player.team.id); const opponent = fixture ? (fixture.homeTeam.id === player.team.id ? fixture.awayTeam : fixture.homeTeam) : null; return <Link className="command-alert-row" href={`/player/${player.slug}`} key={player.id}><span className={`status status-${status.toLowerCase()}`}><i />{status}</span><span><strong>{player.name}</strong><small>{player.team.shortName}{opponent ? ` · próximo ${opponent.shortName}` : ""}</small></span><b>{entry.startingChance}%</b></Link>; })}{unavailable.length + lowChance.length === 0 && <div className="command-clear"><strong>Sin alertas críticas</strong><p>Tu plantilla no contiene incidencias ni probabilidades manuales inferiores al 60 %.</p></div>}</section><aside><p className="eyebrow">Siguiente mejor acción</p><h3>{squad.length < 11 ? "Completa tu plantilla" : unavailable.length ? "Revisa disponibilidad" : missingProjections ? "Añade proyecciones" : "Compara alternativas"}</h3><p>{squad.length < 11 ? "Necesitas al menos once jugadores compatibles para generar una alineación." : unavailable.length ? "Hay jugadores lesionados, sancionados o en duda que pueden cambiar tu once." : missingProjections ? "El total esperado solo se calcula cuando los once titulares tienen proyección manual." : "Tu base está preparada: contrasta ahora dos opciones antes del cierre."}</p><Link className="button button-primary" href={squad.length < 11 || missingProjections ? "/my-team" : unavailable.length ? "/availability" : "/compare"}>Continuar →</Link><Link className="text-link" href="/account">Sincronizar este espacio</Link></aside></div>
  </section>;
}

function buildStarterSquad(players: PlayerListItem[]) {
  const selected: PlayerListItem[] = [];
  const teamCounts = new Map<string, number>();
  for (const [position, wanted] of Object.entries(starterCounts)) {
    for (const player of players.filter((item) => item.position === position)) {
      if (selected.filter((item) => item.position === position).length >= wanted) break;
      if ((teamCounts.get(player.team.id) ?? 0) >= 4) continue;
      selected.push(player);
      teamCounts.set(player.team.id, (teamCounts.get(player.team.id) ?? 0) + 1);
    }
  }
  return selected.map((player) => ({ playerId: player.id, purchasePrice: null, projectedPoints: null, startingChance: player.status === "AVAILABLE" ? 70 : 40 }));
}
