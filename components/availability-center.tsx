"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  effectivePlayerStatus,
  emptyAvailabilityRecord,
  isAvailabilityRecord,
  type AvailabilityConfidence,
  type AvailabilityRecord,
} from "@/domain/availability";
import type { DataProvenance, PlayerListItem, PlayerStatus, TeamSummary } from "@/domain/player";
import { saveAvailabilityRecords, useAvailability } from "./use-availability";

const statusLabels: Record<PlayerStatus, string> = {
  AVAILABLE: "Disponible", DOUBTFUL: "Duda", INJURED: "Lesionado", SUSPENDED: "Sancionado", UNKNOWN: "Sin confirmar",
};
const confidenceLabels: Record<AvailabilityConfidence, string> = {
  CONFIRMED: "Confirmado", REPORTED: "Publicado", EDITORIAL: "Valoración editorial",
};

export function AvailabilityCenter({ players, teams, rounds, selectedRound, provenance }: {
  players: PlayerListItem[]; teams: TeamSummary[]; rounds: number[]; selectedRound: number; provenance: DataProvenance;
}) {
  const { records, byPlayer, loaded } = useAvailability(selectedRound);
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState<PlayerStatus | "ALL" | "INCIDENTS">("ALL");
  const [selectedId, setSelectedId] = useState(players[0]?.id ?? "");
  const [draft, setDraft] = useState<AvailabilityRecord | null>(() => players[0] ? emptyAvailabilityRecord(players[0], selectedRound) : null);
  const [message, setMessage] = useState("Selecciona un jugador y registra únicamente información contrastada.");
  const importRef = useRef<HTMLInputElement>(null);
  const selectedPlayer = players.find((player) => player.id === selectedId) ?? null;

  useEffect(() => {
    if (!loaded || !selectedPlayer) return;
    const frame = window.requestAnimationFrame(() => setDraft(byPlayer.get(selectedPlayer.id) ?? emptyAvailabilityRecord(selectedPlayer, selectedRound)));
    return () => window.cancelAnimationFrame(frame);
  }, [loaded, selectedPlayer, byPlayer, selectedRound]);

  const visiblePlayers = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("es");
    return players.filter((player) => {
      const effective = effectivePlayerStatus(player, byPlayer);
      return (!needle || `${player.name} ${player.team.name}`.toLocaleLowerCase("es").includes(needle))
        && (!teamId || player.team.id === teamId)
        && (status === "ALL" || status === "INCIDENTS" && ["DOUBTFUL", "INJURED", "SUSPENDED"].includes(effective) || effective === status);
    });
  }, [players, byPlayer, search, teamId, status]);

  const incidents = records.filter((record) => ["DOUBTFUL", "INJURED", "SUSPENDED"].includes(record.status));
  const counts = { injured: incidents.filter((record) => record.status === "INJURED").length, doubtful: incidents.filter((record) => record.status === "DOUBTFUL").length, suspended: incidents.filter((record) => record.status === "SUSPENDED").length };

  const choosePlayer = (player: PlayerListItem) => {
    setSelectedId(player.id);
    setDraft(byPlayer.get(player.id) ?? emptyAvailabilityRecord(player, selectedRound));
    setMessage(byPlayer.has(player.id) ? "Incidencia guardada en este dispositivo." : "Sin edición local para esta jornada.");
  };

  const save = () => {
    if (!draft || !selectedPlayer) return;
    const hasIncident = ["DOUBTFUL", "INJURED", "SUSPENDED"].includes(draft.status);
    if (hasIncident && !draft.sourceLabel.trim() && !draft.sourceUrl.trim()) {
      setMessage("Añade al menos el nombre o el enlace de la fuente antes de guardar una incidencia.");
      return;
    }
    if (draft.sourceUrl && !/^https?:\/\//i.test(draft.sourceUrl)) {
      setMessage("El enlace de la fuente debe empezar por https:// o http://");
      return;
    }
    const saved = { ...draft, teamId: selectedPlayer.team.id, updatedAt: new Date().toISOString() };
    const next = [...records.filter((record) => record.playerId !== saved.playerId), saved];
    saveAvailabilityRecords(selectedRound, next);
    setDraft(saved);
    setMessage(`Guardado ${new Date(saved.updatedAt).toLocaleString("es-ES")}.`);
  };

  const clear = () => {
    if (!selectedPlayer) return;
    saveAvailabilityRecords(selectedRound, records.filter((record) => record.playerId !== selectedPlayer.id));
    setDraft(emptyAvailabilityRecord(selectedPlayer, selectedRound));
    setMessage("Edición eliminada; vuelve a aplicarse el estado del proveedor.");
  };

  const exportRecords = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `hypermociones-disponibilidad-j${selectedRound}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  const importRecords = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || !parsed.every((record) => isAvailabilityRecord(record, selectedRound))) throw new Error("El archivo no contiene incidencias válidas de esta jornada.");
      const playerIds = new Set(players.map((player) => player.id));
      saveAvailabilityRecords(selectedRound, parsed.filter((record) => playerIds.has(record.playerId)));
      setMessage(`${parsed.length} registros importados.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Archivo no válido."); }
  };

  if (!loaded) return <section className="setup-state"><span>H</span><div><p className="eyebrow">Centro médico editorial</p><h2>Cargando disponibilidad</h2></div></section>;
  return <>
    <section className="availability-hero"><div><p className="eyebrow">Temporada {provenance.season} · Jornada {selectedRound}</p><h1>Disponibilidad</h1><p>Centraliza lesiones, dudas y sanciones sin convertir rumores sin fuente en hechos.</p></div><div className="availability-summary"><span><b>{counts.injured}</b>Lesionados</span><span><b>{counts.doubtful}</b>Dudas</span><span><b>{counts.suspended}</b>Sancionados</span></div></section>
    <div className="availability-rounds"><nav className="round-selector" aria-label="Seleccionar jornada">{rounds.map((round) => <Link className={round === selectedRound ? "active" : ""} href={`/availability?round=${round}`} key={round}>Jornada {round}</Link>)}</nav><div><button className="button" type="button" onClick={exportRecords}>Exportar</button><button className="button" type="button" onClick={() => importRef.current?.click()}>Importar</button><input ref={importRef} hidden accept="application/json" type="file" onChange={(event) => void importRecords(event.target.files?.[0])} /></div></div>
    <div className="availability-workspace"><section className="availability-browser"><div className="availability-filters"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador o equipo..." /></label><select aria-label="Filtrar por equipo" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Todos los equipos</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select><select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="ALL">Todos los estados</option><option value="INCIDENTS">Solo incidencias</option><option value="AVAILABLE">Disponibles</option><option value="DOUBTFUL">Dudas</option><option value="INJURED">Lesionados</option><option value="SUSPENDED">Sancionados</option><option value="UNKNOWN">Sin confirmar</option></select></div><div className="availability-list-heading"><span>{visiblePlayers.length} jugadores</span><small>Estado efectivo en J{selectedRound}</small></div><div className="availability-list">{visiblePlayers.slice(0, 120).map((player) => {
      const effective = effectivePlayerStatus(player, byPlayer); const record = byPlayer.get(player.id);
      return <button className={selectedId === player.id ? "selected" : ""} type="button" onClick={() => choosePlayer(player)} key={player.id}><span className="team-token" style={{ background: player.team.primaryColor }}>{player.shirtNumber ?? "—"}</span><span><strong>{player.name}</strong><small>{player.team.shortName} · {player.position}</small></span><span className={`status status-${effective.toLowerCase()}`}><i />{statusLabels[effective]}</span>{record && <b className="edited-mark">Editado</b>}</button>;
    })}{visiblePlayers.length > 120 && <p className="availability-limit">Mostrando 120 resultados. Usa los filtros para acotar la lista.</p>}</div></section>
      <aside className="availability-editor">{draft && selectedPlayer ? <><div className="availability-editor-head"><div><p className="eyebrow">Parte del jugador</p><h2>{selectedPlayer.name}</h2><span>{selectedPlayer.team.name} · {selectedPlayer.position}</span></div><Link href={`/player/${selectedPlayer.slug}`}>Abrir ficha ↗</Link></div><label className="editor-field"><span>Estado para la jornada {selectedRound}</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as PlayerStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="editor-field"><span>Motivo / diagnóstico publicado</span><textarea rows={3} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} placeholder="Ej.: molestias musculares; pendiente de pruebas" /></label><label className="editor-field"><span>Regreso estimado</span><input value={draft.expectedReturn} onChange={(event) => setDraft({ ...draft, expectedReturn: event.target.value })} placeholder="Ej.: jornada 3 / sin fecha" /></label><div className="availability-source-grid"><label className="editor-field"><span>Tipo de información</span><select value={draft.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value as AvailabilityConfidence })}>{Object.entries(confidenceLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="editor-field"><span>Nombre de la fuente</span><input value={draft.sourceLabel} onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })} placeholder="Club, RFEF, medio..." /></label></div><label className="editor-field"><span>Enlace original</span><input type="url" value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} placeholder="https://..." /></label><div className={`availability-message ${message.startsWith("Añade") || message.startsWith("El enlace") ? "error" : ""}`} role="status" aria-live="polite">{message}</div><div className="availability-editor-actions"><button className="button button-primary" type="button" onClick={save}>Guardar incidencia</button><button className="button danger" type="button" onClick={clear}>Eliminar edición</button></div><p className="availability-privacy">Se guarda solo en este navegador. Exporta el JSON para conservar o compartir el trabajo editorial.</p></> : <p>Selecciona un jugador.</p>}</aside>
    </div>
  </>;
}
