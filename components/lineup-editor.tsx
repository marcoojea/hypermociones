"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { effectivePlayerStatus, isHardUnavailable } from "@/domain/availability";
import { clampConfidence, emptyLineup, formationCodes, formations, isStoredLineup, lineupStorageKey, type FormationCode, type StoredLineup } from "@/domain/lineup";
import { appendLineupRevision, lineupHistoryStorageKey, parseLineupHistory } from "@/domain/lineup-history";
import type { FixtureListItem } from "@/domain/fixture";
import type { PlayerListItem, Position, TeamSummary } from "@/domain/player";
import { notifyProduct } from "@/domain/product-events";
import { useAvailability } from "./use-availability";

const positionOrder: Position[] = ["POR", "DEF", "MED", "DEL"];

function suggestedLineup(teamId: string, round: number, players: PlayerListItem[], formation: FormationCode = "4-2-3-1") {
  const lineup = emptyLineup(teamId, round, formation);
  const available = new Map(positionOrder.map((position) => [position, players.filter((player) => player.position === position)]));
  lineup.starters = formations[formation].map((slot) => ({ slotId: slot.id, playerId: available.get(slot.position)?.shift()?.id ?? null, confidence: 50 }));
  return lineup;
}

export function LineupEditor({ teams, team, players, round, fixture }: { teams: TeamSummary[]; team: TeamSummary; players: PlayerListItem[]; round: number; fixture: FixtureListItem | null }) {
  const [lineup, setLineup] = useState<StoredLineup>(() => suggestedLineup(team.id, round, players));
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("Borrador automático por posición");
  const importRef = useRef<HTMLInputElement>(null);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const selectedIds = new Set(lineup.starters.flatMap((item) => item.playerId ? [item.playerId] : []));
  const benchIds = new Set(lineup.substitutes.map((item) => item.playerId));
  const roleOptions = lineup.starters.flatMap((item) => item.playerId ? [playerById.get(item.playerId)].filter(Boolean) as PlayerListItem[] : []);
  const opponent = fixture ? (fixture.homeTeam.id === team.id ? fixture.awayTeam : fixture.homeTeam) : null;
  const { byPlayer: availability } = useAvailability(round);
  const selectedAlerts = lineup.starters.flatMap((item) => {
    const player = item.playerId ? playerById.get(item.playerId) : null;
    if (!player) return [];
    const status = effectivePlayerStatus(player, availability);
    return status === "AVAILABLE" || status === "UNKNOWN" ? [] : [{ player, status }];
  });

  useEffect(() => {
    const raw = localStorage.getItem(lineupStorageKey(team.id, round));
    let stored: StoredLineup | null = null;
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isStoredLineup(parsed, team.id, round)) stored = parsed;
      } catch { localStorage.removeItem(lineupStorageKey(team.id, round)); }
    }
    const frame = window.requestAnimationFrame(() => {
      if (stored) {
        setLineup(stored);
        setMessage(`Guardada ${new Date(stored.updatedAt).toLocaleString("es-ES")}`);
      }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [team.id, round]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (transform: (current: StoredLineup) => StoredLineup) => {
    setLineup((current) => transform(current)); setDirty(true); setMessage("Cambios sin guardar");
  };

  const changeFormation = (formation: FormationCode) => update((current) => {
    const remaining = current.starters.flatMap((item) => item.playerId ? [playerById.get(item.playerId)].filter(Boolean) as PlayerListItem[] : []);
    const starters = formations[formation].map((slot) => {
      const index = remaining.findIndex((player) => player.position === slot.position);
      const player = index >= 0 ? remaining.splice(index, 1)[0] : null;
      const old = player ? current.starters.find((item) => item.playerId === player.id) : null;
      return { slotId: slot.id, playerId: player?.id ?? null, confidence: old?.confidence ?? 50 };
    });
    return { ...current, formation, starters };
  });

  const save = () => {
    const saved = { ...lineup, updatedAt: new Date().toISOString() };
    localStorage.setItem(lineupStorageKey(team.id, round), JSON.stringify(saved));
    const historyKey = lineupHistoryStorageKey(team.id, round);
    localStorage.setItem(historyKey, JSON.stringify(appendLineupRevision(parseLineupHistory(localStorage.getItem(historyKey), team.id, round), saved)));
    window.dispatchEvent(new Event("hypermociones:lineup-saved"));
    setLineup(saved); setDirty(false); setMessage(`Guardada ${new Date(saved.updatedAt).toLocaleString("es-ES")}`);
    notifyProduct("Alineación guardada.");
  };
  const reset = () => {
    localStorage.removeItem(lineupStorageKey(team.id, round));
    window.dispatchEvent(new Event("hypermociones:lineup-saved"));
    setLineup(suggestedLineup(team.id, round, players, lineup.formation)); setDirty(false); setMessage("Borrador automático restaurado"); notifyProduct("Borrador restaurado.", "info");
  };
  const exportLineup = () => {
    const blob = new Blob([JSON.stringify(lineup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${team.slug}-j${round}-alineacion.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  const importLineup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isStoredLineup(parsed, team.id, round)) throw new Error("El archivo no corresponde a este equipo y jornada.");
      setLineup(parsed); setDirty(true); setMessage("Alineación importada · pulsa Guardar"); notifyProduct("Alineación importada; revisa y guarda.", "info");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Archivo no válido"); }
  };

  if (!loaded) return <section className="setup-state"><span>H</span><div><p className="eyebrow">Preparando editor</p><h2>Cargando tu alineación</h2></div></section>;
  return <>
    <section className="editor-header"><div><p className="eyebrow">Centro editorial · Jornada {round}</p><h1>Editor de alineaciones</h1><p>{team.name}{opponent ? ` · ${fixture?.homeTeam.id === team.id ? "vs" : "@"} ${opponent.name}` : ""}</p></div><div className={`save-state ${dirty ? "dirty" : ""}`} role="status" aria-live="polite"><i /><span>{message}</span></div></section>
    <div className="editor-toolbar"><label><span>Equipo</span><select value={team.slug} onChange={(event) => { window.location.href = `/lineups/editor?team=${event.target.value}&round=${round}`; }}>{teams.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label><label><span>Jornada</span><select value={round} onChange={(event) => { window.location.href = `/lineups/editor?team=${team.slug}&round=${event.target.value}`; }}><option value={1}>Jornada 1</option><option value={2}>Jornada 2</option></select></label><label><span>Formación</span><select value={lineup.formation} onChange={(event) => changeFormation(event.target.value as FormationCode)}>{formationCodes.map((formation) => <option key={formation}>{formation}</option>)}</select></label><div className="editor-toolbar-actions"><Link className="button" href={`/team/${team.slug}`}>Ficha del equipo</Link><button className="button button-primary" type="button" onClick={save}>Guardar alineación</button></div></div>
    <div className="editor-layout"><section className="editor-pitch-panel"><div className="editor-section-heading"><div><p className="eyebrow">Once inicial</p><h2>{lineup.formation}</h2></div><span>{lineup.starters.filter((item) => item.playerId).length}/11 seleccionados</span></div>{selectedAlerts.length > 0 && <div className="lineup-availability-alert"><strong>{selectedAlerts.length} alertas en el once</strong>{selectedAlerts.map(({ player, status }) => <span key={player.id}>{player.name} · {status}</span>)}<Link href={`/availability?round=${round}`}>Revisar partes →</Link></div>}<div className="football-pitch editor-pitch"><div className="pitch-circle" /><div className="pitch-halfway" /><div className="pitch-box pitch-box-top" /><div className="pitch-box pitch-box-bottom" />{formations[lineup.formation].map((slot) => {
      const selection = lineup.starters.find((item) => item.slotId === slot.id)!;
      return <div className="pitch-editor-slot" style={{ left: `${slot.x}%`, top: `${slot.y}%` }} key={slot.id}><select aria-label={slot.label} value={selection.playerId ?? ""} onChange={(event) => update((current) => ({ ...current, starters: current.starters.map((item) => item.slotId === slot.id ? { ...item, playerId: event.target.value || null } : item) }))}><option value="">{slot.position}</option>{players.filter((player) => player.position === slot.position).map((player) => { const status = effectivePlayerStatus(player, availability); return <option disabled={(selectedIds.has(player.id) && selection.playerId !== player.id) || isHardUnavailable(status) && selection.playerId !== player.id} value={player.id} key={player.id}>{player.name}{status !== "AVAILABLE" && status !== "UNKNOWN" ? ` · ${status}` : ""}</option>; })}</select><label><span>Confianza</span><input aria-label={`Confianza ${slot.label}`} type="number" min={0} max={100} value={selection.confidence} onChange={(event) => update((current) => ({ ...current, starters: current.starters.map((item) => item.slotId === slot.id ? { ...item, confidence: clampConfidence(Number(event.target.value)) } : item) }))} /><b>%</b></label></div>;
    })}</div></section>
      <aside className="editor-side"><section className="editor-card"><div className="editor-section-heading"><div><p className="eyebrow">Roles</p><h2>Responsabilidades</h2></div></div>{([ ["captainId", "Capitán"], ["penaltyTakerId", "Penaltis"], ["freeKickTakerId", "Faltas"], ["cornerTakerId", "Córners"] ] as const).map(([key, label]) => <label className="editor-field" key={key}><span>{label}</span><select value={lineup[key] ?? ""} onChange={(event) => update((current) => ({ ...current, [key]: event.target.value || null }))}><option value="">Sin asignar</option>{roleOptions.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label>)}</section>
      <section className="editor-card"><div className="editor-section-heading"><div><p className="eyebrow">Banquillo</p><h2>Alternativas</h2></div><span>{lineup.substitutes.length}</span></div><label className="editor-field"><span>Añadir jugador</span><select value="" onChange={(event) => { const playerId = event.target.value; if (playerId) update((current) => ({ ...current, substitutes: [...current.substitutes, { playerId, confidence: 30 }] })); }}><option value="">Seleccionar…</option>{players.filter((player) => !selectedIds.has(player.id) && !benchIds.has(player.id) && !isHardUnavailable(effectivePlayerStatus(player, availability))).map((player) => <option value={player.id} key={player.id}>{player.position} · {player.name}</option>)}</select></label><div className="bench-list">{lineup.substitutes.map((item) => <div key={item.playerId}><span><strong>{playerById.get(item.playerId)?.name}</strong><small>{playerById.get(item.playerId)?.position}</small></span><label><input aria-label={`Confianza suplente ${playerById.get(item.playerId)?.name}`} type="number" min={0} max={100} value={item.confidence} onChange={(event) => update((current) => ({ ...current, substitutes: current.substitutes.map((bench) => bench.playerId === item.playerId ? { ...bench, confidence: clampConfidence(Number(event.target.value)) } : bench) }))} />%</label><button aria-label={`Quitar ${playerById.get(item.playerId)?.name}`} type="button" onClick={() => update((current) => ({ ...current, substitutes: current.substitutes.filter((bench) => bench.playerId !== item.playerId) }))}>×</button></div>)}</div></section>
      <section className="editor-card"><div className="editor-section-heading"><div><p className="eyebrow">Contexto</p><h2>Notas editoriales</h2></div></div><textarea value={lineup.notes} onChange={(event) => update((current) => ({ ...current, notes: event.target.value }))} placeholder="Lesiones, rotaciones, declaraciones del entrenador, alternativas…" rows={5} /></section>
      <section className="editor-card editor-data-card"><button type="button" onClick={exportLineup}>Exportar JSON</button><button type="button" onClick={() => importRef.current?.click()}>Importar JSON</button><button className="danger" type="button" onClick={reset}>Restaurar borrador</button><input ref={importRef} hidden accept="application/json" type="file" onChange={(event) => void importLineup(event.target.files?.[0])} /></section></aside>
    </div>
  </>;
}
