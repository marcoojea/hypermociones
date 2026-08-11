import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { RealDataSnapshot } from "@/data/real-data-types";
import * as schema from "@/db/schema";

const withoutPrefix = (value: string, prefix: string) => value.startsWith(prefix) ? value.slice(prefix.length) : value;
const fixtureStatus = (status: string): "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED" => {
  if (status === "FINISHED") return "FINISHED";
  if (status === "IN_PLAY" || status === "PAUSED") return "LIVE";
  if (status === "POSTPONED" || status === "SUSPENDED") return "POSTPONED";
  if (status === "CANCELLED") return "CANCELLED";
  return "SCHEDULED";
};

export async function persistRealDataSnapshot(snapshot: RealDataSnapshot, databaseUrl: string) {
  if (!snapshot.metadata) throw new Error("El snapshot no contiene metadata real.");
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  let importRunId: string | null = null;
  let providerId: string | null = null;
  try {
    const [provider] = await db.insert(schema.dataProviders).values({ code: snapshot.metadata.provider, name: "football-data.org", category: "football", accessMethod: "REST API token", licenseNotes: "Uso sujeto al plan contratado y sus términos; no redistribuir el feed bruto." }).onConflictDoUpdate({ target: schema.dataProviders.code, set: { enabled: true, updatedAt: new Date() } }).returning({ id: schema.dataProviders.id });
    providerId = provider.id;
    const [run] = await db.insert(schema.dataImportRuns).values({ providerId, status: "RUNNING", startedAt: new Date() }).returning({ id: schema.dataImportRuns.id });
    importRunId = run.id;
    await db.transaction(async (tx) => {
      const [competition] = await tx.insert(schema.competitions).values({ providerId: provider.id, externalId: snapshot.metadata!.competitionExternalId, name: "Segunda División", slug: "laliga-hypermotion", countryCode: "ESP" }).onConflictDoUpdate({ target: [schema.competitions.providerId, schema.competitions.externalId], set: { name: "Segunda División", updatedAt: new Date() } }).returning({ id: schema.competitions.id });
      const [season] = await tx.insert(schema.seasons).values({ competitionId: competition.id, providerId: provider.id, externalId: snapshot.metadata!.seasonExternalId, name: snapshot.metadata!.season, startsOn: snapshot.metadata!.startsOn, endsOn: snapshot.metadata!.endsOn, current: true }).onConflictDoUpdate({ target: [schema.seasons.providerId, schema.seasons.externalId], set: { startsOn: snapshot.metadata!.startsOn, endsOn: snapshot.metadata!.endsOn, current: true, updatedAt: new Date() } }).returning({ id: schema.seasons.id });
      const teamIds = new Map<string, string>();
      for (const team of snapshot.teams) {
        const externalId = withoutPrefix(team.id, "fd-team-");
        const [record] = await tx.insert(schema.teams).values({ providerId: provider.id, externalId, name: team.name, shortName: team.shortName, slug: team.slug, crestUrl: team.crestUrl }).onConflictDoUpdate({ target: [schema.teams.providerId, schema.teams.externalId], set: { name: team.name, shortName: team.shortName, slug: team.slug, crestUrl: team.crestUrl, updatedAt: new Date() } }).returning({ id: schema.teams.id });
        teamIds.set(team.id, record.id);
      }
      const playerIds = new Map<string, string>();
      for (const player of snapshot.players) {
        const externalId = withoutPrefix(player.id, "fd-player-");
        const teamId = teamIds.get(player.team.id); if (!teamId) throw new Error(`Equipo no encontrado para ${player.name}`);
        const [record] = await tx.insert(schema.players).values({ providerId: provider.id, externalId, name: player.name, slug: player.slug, nationality: player.nationality, preferredPosition: player.position }).onConflictDoUpdate({ target: [schema.players.providerId, schema.players.externalId], set: { name: player.name, slug: player.slug, nationality: player.nationality, preferredPosition: player.position, updatedAt: new Date() } }).returning({ id: schema.players.id });
        playerIds.set(player.id, record.id);
        await tx.insert(schema.playerTeams).values({ playerId: record.id, teamId, seasonId: season.id, shirtNumber: player.shirtNumber, startsOn: snapshot.metadata!.startsOn }).onConflictDoUpdate({ target: [schema.playerTeams.playerId, schema.playerTeams.teamId, schema.playerTeams.seasonId, schema.playerTeams.startsOn], set: { shirtNumber: player.shirtNumber, updatedAt: new Date() } });
        if ([player.appearances, player.starts, player.minutes, player.goals, player.assists].some((value) => value !== null)) {
          await tx.insert(schema.playerSeasonStats).values({ seasonId: season.id, playerId: record.id, teamId, providerId: provider.id, appearances: player.appearances, starts: player.starts, minutes: player.minutes, goals: player.goals, assists: player.assists, capturedAt: new Date(snapshot.metadata!.importedAt) }).onConflictDoUpdate({ target: [schema.playerSeasonStats.seasonId, schema.playerSeasonStats.playerId, schema.playerSeasonStats.teamId, schema.playerSeasonStats.providerId], set: { appearances: player.appearances, starts: player.starts, minutes: player.minutes, goals: player.goals, assists: player.assists, capturedAt: new Date(snapshot.metadata!.importedAt), updatedAt: new Date() } });
        }
      }
      for (const fixture of snapshot.fixtures) {
        const homeTeamId = teamIds.get(fixture.homeTeam.id); const awayTeamId = teamIds.get(fixture.awayTeam.id);
        if (!homeTeamId || !awayTeamId) throw new Error(`Equipos incompletos en fixture ${fixture.externalId}`);
        await tx.insert(schema.fixtures).values({ seasonId: season.id, providerId: provider.id, externalId: fixture.externalId, round: fixture.round ?? 0, kickoffAt: new Date(fixture.kickoffAt), homeTeamId, awayTeamId, status: fixtureStatus(fixture.status), homeScore: fixture.homeScore, awayScore: fixture.awayScore }).onConflictDoUpdate({ target: [schema.fixtures.providerId, schema.fixtures.externalId], set: { round: fixture.round ?? 0, kickoffAt: new Date(fixture.kickoffAt), status: fixtureStatus(fixture.status), homeScore: fixture.homeScore, awayScore: fixture.awayScore, updatedAt: new Date() } });
      }
    });
    await db.update(schema.dataImportRuns).set({ status: "SUCCEEDED", finishedAt: new Date(), recordsFetched: snapshot.teams.length + snapshot.players.length + snapshot.fixtures.length, recordsInserted: snapshot.teams.length + snapshot.players.length + snapshot.fixtures.length, updatedAt: new Date() }).where(eq(schema.dataImportRuns.id, importRunId));
  } catch (error) {
    if (importRunId && providerId) await db.update(schema.dataImportRuns).set({ status: "FAILED", finishedAt: new Date(), errors: [{ message: error instanceof Error ? error.message : String(error) }], updatedAt: new Date() }).where(eq(schema.dataImportRuns.id, importRunId));
    throw error;
  } finally {
    await client.end();
  }
}
