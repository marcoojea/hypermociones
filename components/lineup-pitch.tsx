import type { StoredLineup } from "@/domain/lineup";
import { formations } from "@/domain/lineup";
import { effectivePlayerStatus, type AvailabilityRecord } from "@/domain/availability";
import type { PlayerListItem } from "@/domain/player";

export function LineupPitch({ lineup, players, availability = new Map(), compact = false }: { lineup: StoredLineup; players: Map<string, PlayerListItem>; availability?: ReadonlyMap<string, AvailabilityRecord>; compact?: boolean }) {
  const selectionBySlot = new Map(lineup.starters.map((selection) => [selection.slotId, selection]));
  return <div className={`football-pitch ${compact ? "compact" : ""}`} aria-label={`Alineación ${lineup.formation}`}>
    <div className="pitch-circle" /><div className="pitch-halfway" /><div className="pitch-box pitch-box-top" /><div className="pitch-box pitch-box-bottom" />
    {formations[lineup.formation].map((slot) => {
      const selection = selectionBySlot.get(slot.id);
      const player = selection?.playerId ? players.get(selection.playerId) : null;
      const status = player ? effectivePlayerStatus(player, availability) : null;
      const alert = status === "INJURED" || status === "SUSPENDED" || status === "DOUBTFUL";
      return <div className={`pitch-player ${alert ? `has-alert alert-${status.toLowerCase()}` : ""}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} key={slot.id}>
        <span>{selection?.confidence ?? 0}%</span><strong>{player?.name ?? slot.position}</strong>
        {lineup.captainId === player?.id && <b title="Capitán">C</b>}
        {alert && <i title={status ?? undefined}>!</i>}
      </div>;
    })}
  </div>;
}
