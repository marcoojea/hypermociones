"use client";

import Link from "next/link";
import { effectivePlayerStatus } from "@/domain/availability";
import type { PlayerListItem, PlayerStatus } from "@/domain/player";
import { useAvailability } from "./use-availability";

const labels: Record<PlayerStatus, string> = { AVAILABLE: "Disponible", DOUBTFUL: "Duda", INJURED: "Lesionado", SUSPENDED: "Sancionado", UNKNOWN: "Sin confirmar" };

export function TeamAvailabilityKpi({ players, round = 1 }: { players: PlayerListItem[]; round?: number }) {
  const { byPlayer, loaded } = useAvailability(round);
  const count = players.filter((player) => ["DOUBTFUL", "INJURED", "SUSPENDED"].includes(effectivePlayerStatus(player, byPlayer))).length;
  return <div><span>Disponibilidad</span><strong>{loaded ? count || "—" : "…"}</strong><small>{loaded && count ? "con incidencia" : "sin incidencias cargadas"}</small></div>;
}

export function TeamAvailabilityPanel({ players, round = 1 }: { players: PlayerListItem[]; round?: number }) {
  const { byPlayer, loaded } = useAvailability(round);
  const incidents = players.filter((player) => ["DOUBTFUL", "INJURED", "SUSPENDED"].includes(effectivePlayerStatus(player, byPlayer)));
  return <section className="panel availability-panel"><div className="panel-heading"><div><p className="eyebrow">Disponibilidad · J{round}</p><h2>Alertas de plantilla</h2></div><Link href={`/availability?round=${round}`}>Editar →</Link></div>{loaded && incidents.length ? incidents.map((player) => {
    const status = effectivePlayerStatus(player, byPlayer); const record = byPlayer.get(player.id);
    return <Link href={`/player/${player.slug}`} key={player.id}><span><strong>{player.name}</strong>{record?.reason && <small>{record.reason}</small>}</span><span className={`status status-${status.toLowerCase()}`}><i />{labels[status]}</span></Link>;
  }) : <div className="availability-empty"><strong>{loaded ? "Sin incidencias cargadas" : "Cargando partes"}</strong><p>Los estados no publicados por la fuente permanecen sin confirmar. Puedes añadir partes contrastados desde el centro de disponibilidad.</p></div>}</section>;
}
