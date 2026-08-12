import type { StoredLineup } from "@/domain/lineup";
import { formations } from "@/domain/lineup";
import type { PlayerListItem } from "@/domain/player";

export function LineupPitch({ lineup, players, compact = false }: { lineup: StoredLineup; players: Map<string, PlayerListItem>; compact?: boolean }) {
  const selectionBySlot = new Map(lineup.starters.map((selection) => [selection.slotId, selection]));
  return <div className={`football-pitch ${compact ? "compact" : ""}`} aria-label={`Alineación ${lineup.formation}`}>
    <div className="pitch-circle" /><div className="pitch-halfway" /><div className="pitch-box pitch-box-top" /><div className="pitch-box pitch-box-bottom" />
    {formations[lineup.formation].map((slot) => {
      const selection = selectionBySlot.get(slot.id);
      const player = selection?.playerId ? players.get(selection.playerId) : null;
      return <div className="pitch-player" style={{ left: `${slot.x}%`, top: `${slot.y}%` }} key={slot.id}>
        <span>{selection?.confidence ?? 0}%</span><strong>{player?.name ?? slot.position}</strong>
        {lineup.captainId === player?.id && <b title="Capitán">C</b>}
      </div>;
    })}
  </div>;
}
