"use client";

import Link from "next/link";
import { effectivePlayerStatus } from "@/domain/availability";
import type { PlayerListItem, PlayerStatus } from "@/domain/player";
import { useAvailability } from "./use-availability";

const labels: Record<PlayerStatus, string> = { AVAILABLE: "Disponible", DOUBTFUL: "Duda", INJURED: "Lesionado", SUSPENDED: "Sancionado", UNKNOWN: "Sin confirmar" };

export function PlayerAvailabilityStatus({ player, round = 1 }: { player: PlayerListItem; round?: number }) {
  const { byPlayer } = useAvailability(round);
  const status = effectivePlayerStatus(player, byPlayer);
  return <span className={`status status-${status.toLowerCase()}`}><i />{labels[status]}</span>;
}

export function PlayerAvailabilityDetail({ player, round = 1 }: { player: PlayerListItem; round?: number }) {
  const { byPlayer, loaded } = useAvailability(round);
  const record = byPlayer.get(player.id);
  if (!loaded || !record) return null;
  return <section className={`player-availability-detail status-border-${record.status.toLowerCase()}`}><div><p className="eyebrow">Parte de disponibilidad · J{round}</p><strong>{labels[record.status]}</strong>{record.reason && <span>{record.reason}</span>}</div><div>{record.expectedReturn && <span><small>Regreso estimado</small>{record.expectedReturn}</span>}<span><small>Fuente</small>{record.sourceUrl ? <a href={record.sourceUrl} target="_blank" rel="noreferrer">{record.sourceLabel || "Abrir fuente"} ↗</a> : record.sourceLabel || "Valoración editorial"}</span></div><Link href={`/availability?round=${round}`}>Editar parte →</Link></section>;
}
