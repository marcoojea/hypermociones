"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { effectivePlayerStatus } from "@/domain/availability";
import {
  emptyFantasyTeam, isMyFantasyTeam, myTeamStorageKey, optimizeFantasyLineup,
  type FantasySquadEntry, type MyFantasyTeam,
} from "@/domain/fantasy-team";
import { formationCodes, type FormationCode } from "@/domain/lineup";
import type { DataProvenance, PlayerListItem, PlayerStatus, TeamSummary } from "@/domain/player";
import { LineupPitch } from "./lineup-pitch";
import { useAvailability } from "./use-availability";

const statusLabels: Record<PlayerStatus, string> = { AVAILABLE: "Disponible", DOUBTFUL: "Duda", INJURED: "Lesionado", SUSPENDED: "Sancionado", UNKNOWN: "Sin confirmar" };
const positionOrder = { POR: 0, DEF: 1, MED: 2, DEL: 3 } as const;

function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export function MyTeamManager({ players, teams, rounds, provenance }: { players: PlayerListItem[]; teams: TeamSummary[]; rounds: number[]; provenance: DataProvenance }) {
  const [team, setTeam] = useState<MyFantasyTeam>(() => emptyFantasyTeam(rounds[0] ?? 1));
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [message, setMessage] = useState("Crea tu plantilla manualmente; se guardará solo en este navegador.");
  const importRef = useRef<HTMLInputElement>(null);
  const { byPlayer: availability } = useAvailability(team.round);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const entryById = useMemo(() => new Map(team.squad.map((entry) => [entry.playerId, entry])), [team.squad]);
  const statusById = useMemo(() => new Map(players.map((player) => [player.id, effectivePlayerStatus(player, availability)])), [players, availability]);
  const recommendation = useMemo(() => optimizeFantasyLineup({ team, players, statuses: statusById }), [team, players, statusById]);

  useEffect(() => {
    const raw = localStorage.getItem(myTeamStorageKey);
    let stored: MyFantasyTeam | null = null;
    if (raw) {
      try { const parsed: unknown = JSON.parse(raw); if (isMyFantasyTeam(parsed)) stored = parsed; }
      catch { localStorage.removeItem(myTeamStorageKey); }
    }
    const frame = window.requestAnimationFrame(() => { if (stored) setTeam(stored); setLoaded(true); });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const update = (transform: (current: MyFantasyTeam) => MyFantasyTeam) => {
    setTeam((current) => transform(current)); setDirty(true); setMessage("Cambios sin guardar.");
  };
  const save = () => {
    const saved = { ...team, updatedAt: new Date().toISOString() };
    localStorage.setItem(myTeamStorageKey, JSON.stringify(saved)); setTeam(saved); setDirty(false);
    setMessage(`Equipo guardado ${new Date(saved.updatedAt).toLocaleString("es-ES")}.`);
  };
  const addPlayer = (player: PlayerListItem) => {
    if (entryById.has(player.id)) return;
    if (team.squad.length >= team.rules.squadSize) { setMessage(`La plantilla está limitada a ${team.rules.squadSize} jugadores.`); return; }
    const clubCount = team.squad.filter((entry) => playerById.get(entry.playerId)?.team.id === player.team.id).length;
    if (clubCount >= team.rules.maxPlayersPerClub) { setMessage(`El límite configurado es ${team.rules.maxPlayersPerClub} jugadores de ${player.team.name}.`); return; }
    update((current) => ({ ...current, squad: [...current.squad, { playerId: player.id, purchasePrice: null, projectedPoints: null, startingChance: 60 }] }));
  };
  const updateEntry = (playerId: string, values: Partial<FantasySquadEntry>) => update((current) => ({ ...current, squad: current.squad.map((entry) => entry.playerId === playerId ? { ...entry, ...values } : entry) }));
  const removePlayer = (playerId: string) => update((current) => ({ ...current, squad: current.squad.filter((entry) => entry.playerId !== playerId) }));
  const reset = () => { localStorage.removeItem(myTeamStorageKey); setTeam(emptyFantasyTeam(rounds[0] ?? 1)); setDirty(false); setMessage("Plantilla reiniciada."); };
  const loadTestSquad = () => {
    const quotas = new Map([["POR", 2], ["DEF", 8], ["MED", 8], ["DEL", 7]] as const);
    const selected: FantasySquadEntry[] = [];
    const clubCounts = new Map<string, number>();
    for (const [position, quota] of quotas) {
      const candidatesForPosition = players.filter((player) => player.position === position).sort((a, b) => a.name.localeCompare(b.name, "es"));
      for (const player of candidatesForPosition) {
        if (selected.filter((entry) => playerById.get(entry.playerId)?.position === position).length >= quota) break;
        if ((clubCounts.get(player.team.id) ?? 0) >= team.rules.maxPlayersPerClub) continue;
        selected.push({ playerId: player.id, purchasePrice: null, projectedPoints: null, startingChance: 60 });
        clubCounts.set(player.team.id, (clubCounts.get(player.team.id) ?? 0) + 1);
      }
    }
    update((current) => ({ ...current, name: "Plantilla de prueba", squad: selected.slice(0, current.rules.squadSize) }));
    setMessage("Plantilla de prueba cargada con el catálogo real; no contiene precios ni proyecciones inventadas.");
  };
  const importTeam = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isMyFantasyTeam(parsed)) throw new Error("El archivo no contiene un equipo compatible.");
      const knownIds = new Set(players.map((player) => player.id));
      const sanitized = { ...parsed, squad: parsed.squad.filter((entry) => knownIds.has(entry.playerId)) };
      setTeam(sanitized); setDirty(true); setMessage(`${sanitized.squad.length} jugadores importados; pulsa Guardar.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Archivo no válido."); }
  };

  const needle = search.trim().toLocaleLowerCase("es");
  const candidates = players.filter((player) => !entryById.has(player.id) && (!needle || `${player.name} ${player.team.name}`.toLocaleLowerCase("es").includes(needle)) && (!teamFilter || player.team.id === teamFilter)).slice(0, 80);
  const squadPlayers = team.squad.flatMap((entry) => { const player = playerById.get(entry.playerId); return player ? [{ player, entry }] : []; }).sort((a, b) => positionOrder[a.player.position] - positionOrder[b.player.position] || a.player.name.localeCompare(b.player.name, "es"));
  const totalCost = team.squad.reduce((sum, entry) => sum + (entry.purchasePrice ?? 0), 0);
  const hardUnavailable = squadPlayers.filter(({ player }) => ["INJURED", "SUSPENDED"].includes(statusById.get(player.id) ?? player.status)).length;
  const clubRuleViolations = teams.filter((club) => team.squad.filter((entry) => playerById.get(entry.playerId)?.team.id === club.id).length > team.rules.maxPlayersPerClub);

  if (!loaded) return <section className="setup-state"><span>H</span><div><p className="eyebrow">Fantasy workspace</p><h2>Cargando Mi equipo</h2></div></section>;
  return <>
    <section className="my-team-hero"><div><p className="eyebrow">{provenance.season} · Jornada {team.round}</p><h1>Mi equipo</h1><p>Construye tu plantilla y genera el mejor once posible con reglas transparentes.</p></div><div className={`save-state ${dirty ? "dirty" : ""}`} role="status" aria-live="polite"><i /><span>{message}</span></div></section>
    <div className="my-team-toolbar"><label><span>Nombre</span><input value={team.name} onChange={(event) => update((current) => ({ ...current, name: event.target.value }))} /></label><label><span>Jornada</span><select value={team.round} onChange={(event) => update((current) => ({ ...current, round: Number(event.target.value) }))}>{rounds.map((round) => <option value={round} key={round}>Jornada {round}</option>)}</select></label><label><span>Formación</span><select value={team.formation} onChange={(event) => update((current) => ({ ...current, formation: event.target.value as FormationCode }))}>{team.rules.allowedFormations.map((formation) => <option key={formation}>{formation}</option>)}</select></label><label><span>Presupuesto (M)</span><input className="budget-input" type="number" min={0} step="0.1" value={team.budget ?? ""} onChange={(event) => update((current) => ({ ...current, budget: event.target.value === "" ? null : Number(event.target.value) }))} placeholder="Opcional" /></label><div className="my-team-toolbar-actions"><button className="button" type="button" onClick={() => downloadJson("hypermociones-mi-equipo.json", team)}>Exportar</button><button className="button" type="button" onClick={() => importRef.current?.click()}>Importar</button><button className="button button-primary" type="button" onClick={save}>Guardar equipo</button><input ref={importRef} hidden accept="application/json" type="file" onChange={(event) => void importTeam(event.target.files?.[0])} /></div></div>
    <section className="my-team-kpis"><div><span>Plantilla</span><strong>{team.squad.length}/{team.rules.squadSize}</strong><small>jugadores</small></div><div className={team.budget !== null && totalCost > team.budget ? "kpi-alert" : ""}><span>Coste cargado</span><strong>{totalCost ? `${totalCost.toFixed(1)} M` : "—"}</strong><small>{team.budget !== null ? `presupuesto ${team.budget.toFixed(1)} M` : "precio manual"}</small></div><div><span>Incidencias</span><strong>{hardUnavailable}</strong><small>lesionados o sancionados</small></div><div><span>Once</span><strong>{recommendation.starters.length}/11</strong><small>{recommendation.formation}</small></div></section>
    <div className="my-team-layout"><section className="my-team-squad"><div className="my-team-section-heading"><div><p className="eyebrow">Plantilla Fantasy</p><h2>Jugadores seleccionados</h2></div><span>Proyección y titularidad son datos manuales</span></div>{squadPlayers.length ? <div className="squad-editor-table"><div className="squad-editor-head"><span>Jugador</span><span>Precio (M)</span><span>Proy.</span><span>Titular</span><span>Estado</span><span /></div>{squadPlayers.map(({ player, entry }) => { const status = statusById.get(player.id) ?? player.status; return <div className="squad-editor-row" key={player.id}><Link href={`/player/${player.slug}`}><span className="team-token" style={{ background: player.team.primaryColor }}>{player.shirtNumber ?? player.position}</span><span><strong>{player.name}</strong><small>{player.team.shortName} · {player.position}</small></span></Link><input aria-label={`Precio de ${player.name}`} type="number" min={0} step="0.1" value={entry.purchasePrice ?? ""} onChange={(event) => updateEntry(player.id, { purchasePrice: event.target.value === "" ? null : Number(event.target.value) })} placeholder="—" /><input aria-label={`Proyección de ${player.name}`} type="number" min={0} step="0.1" value={entry.projectedPoints ?? ""} onChange={(event) => updateEntry(player.id, { projectedPoints: event.target.value === "" ? null : Number(event.target.value) })} placeholder="—" /><label className="chance-input"><input aria-label={`Probabilidad de titularidad de ${player.name}`} type="number" min={0} max={100} value={entry.startingChance} onChange={(event) => updateEntry(player.id, { startingChance: Math.max(0, Math.min(100, Number(event.target.value))) })} /><span>%</span></label><span className={`status status-${status.toLowerCase()}`}><i />{statusLabels[status]}</span><button aria-label={`Quitar ${player.name}`} type="button" onClick={() => removePlayer(player.id)}>×</button></div>; })}</div> : <div className="my-team-empty"><strong>Tu plantilla está vacía</strong><p>Busca jugadores en el panel derecho y añádelos. La versión inicial admite hasta {team.rules.squadSize} futbolistas.</p></div>}</section>
      <aside className="my-team-add"><div className="my-team-section-heading"><div><p className="eyebrow">Mercado manual</p><h2>Añadir jugadores</h2></div><button className="test-squad-button" type="button" onClick={loadTestSquad}>Cargar plantilla de prueba</button></div><div className="my-team-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador..." /><select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="">Todos los equipos</option>{teams.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select></div><div className="my-team-candidates">{candidates.map((player) => { const status = statusById.get(player.id) ?? player.status; return <button type="button" onClick={() => addPlayer(player)} key={player.id}><span className="team-token" style={{ background: player.team.primaryColor }}>{player.position}</span><span><strong>{player.name}</strong><small>{player.team.shortName} · {statusLabels[status]}</small></span><b>+</b></button>; })}</div></aside>
    </div>
    <section className="optimizer-block"><div className="optimizer-heading"><div><p className="eyebrow">Motor independiente · v1 explicable</p><h2>Once recomendado</h2><p>Optimiza el índice de decisión respetando posición, formación, disponibilidad y límite por club.</p></div><div><span>Proyección total</span><strong>{recommendation.totalProjectedPoints === null ? "—" : recommendation.totalProjectedPoints.toFixed(1)}</strong><small>{recommendation.totalProjectedPoints === null ? "Completa la proyección de los 11" : "puntos manuales"}</small></div></div>
      <div className="optimizer-layout"><div><LineupPitch lineup={recommendation.lineup} players={playerById} availability={availability} /><div className="optimizer-bench"><small>Banquillo recomendado</small>{recommendation.bench.map((decision) => <span key={decision.playerId}><b>{decision.score.toFixed(1)}</b>{playerById.get(decision.playerId)?.name}</span>)}</div></div><aside className="optimizer-side"><section><p className="eyebrow">Reglas Fantasy</p><h3>Configuración</h3><label className="editor-field"><span>Máximo de plantilla</span><input type="number" min={11} max={40} value={team.rules.squadSize} onChange={(event) => update((current) => ({ ...current, rules: { ...current.rules, squadSize: Number(event.target.value) } }))} /></label><label className="editor-field"><span>Máximo por club</span><input type="number" min={1} max={11} value={team.rules.maxPlayersPerClub} onChange={(event) => update((current) => ({ ...current, rules: { ...current.rules, maxPlayersPerClub: Number(event.target.value) } }))} /></label><label className="editor-field"><span>Suplentes</span><input type="number" min={0} max={12} value={team.rules.benchSize} onChange={(event) => update((current) => ({ ...current, rules: { ...current.rules, benchSize: Number(event.target.value) } }))} /></label><label className="rules-check"><input type="checkbox" checked={team.rules.captainEnabled} onChange={(event) => update((current) => ({ ...current, rules: { ...current.rules, captainEnabled: event.target.checked } }))} />Elegir capitán</label><div className="allowed-formations"><small>Formaciones permitidas</small>{formationCodes.map((formation) => <label key={formation}><input type="checkbox" checked={team.rules.allowedFormations.includes(formation)} disabled={team.rules.allowedFormations.length === 1 && team.rules.allowedFormations.includes(formation)} onChange={(event) => update((current) => ({ ...current, rules: { ...current.rules, allowedFormations: event.target.checked ? [...current.rules.allowedFormations, formation] : current.rules.allowedFormations.filter((item) => item !== formation) }, formation: event.target.checked || current.formation !== formation ? current.formation : current.rules.allowedFormations.find((item) => item !== formation) ?? current.formation }))} />{formation}</label>)}</div>{clubRuleViolations.length > 0 && <p className="rules-warning">Superan el límite: {clubRuleViolations.map((club) => club.shortName).join(", ")}</p>}</section><section><p className="eyebrow">Explicabilidad</p><h3>Decisiones principales</h3><div className="optimizer-decisions">{recommendation.starters.slice().sort((a, b) => b.score - a.score).slice(0, 6).map((decision) => <div key={decision.playerId}><span><strong>{playerById.get(decision.playerId)?.name}</strong><b>{decision.score.toFixed(1)}</b></span>{decision.reasons.slice(0, 2).map((reason) => <small key={reason}>+ {reason}</small>)}{decision.risks.slice(0, 1).map((risk) => <small className="risk" key={risk}>! {risk}</small>)}</div>)}</div></section>{recommendation.warnings.length > 0 && <section className="optimizer-warnings"><p className="eyebrow">Antes de confirmar</p>{recommendation.warnings.map((warning) => <p key={warning}>! {warning}</p>)}</section>}</aside></div>
    </section>
    <div className="my-team-footer-actions"><Link className="button" href={`/availability?round=${team.round}`}>Revisar disponibilidad</Link><button className="button danger" type="button" onClick={reset}>Reiniciar Mi equipo</button></div>
  </>;
}
