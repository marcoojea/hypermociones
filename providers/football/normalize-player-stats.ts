import { z } from "zod";

export interface NormalizedPlayerMatchStats {
  fixtureExternalId: string; playerExternalId: string; minutes: number; started: boolean;
  goals: number; assists: number; xg?: number; xa?: number;
}

const rawStatsSchema = z.object({
  fixtureExternalId: z.string().min(1), playerExternalId: z.string().min(1),
  minutes: z.number().int().min(0).max(130), started: z.boolean(),
  goals: z.number().int().min(0), assists: z.number().int().min(0),
  xg: z.number().min(0).optional(), xa: z.number().min(0).optional(),
});

export function normalizePlayerMatchStats(input: unknown): NormalizedPlayerMatchStats {
  return rawStatsSchema.parse(input);
}
