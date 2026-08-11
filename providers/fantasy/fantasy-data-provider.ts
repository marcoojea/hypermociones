export interface FantasySnapshotInput { playerExternalId: string; capturedAt: Date; priceCents?: number; totalPoints?: number; ownershipPercent?: number; }

export interface FantasyDataProvider {
  readonly code: string;
  getPlayerSnapshots(seasonExternalId: string): Promise<readonly FantasySnapshotInput[]>;
}
