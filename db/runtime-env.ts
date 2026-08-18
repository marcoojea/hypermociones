import type { drizzle } from "drizzle-orm/d1";

export interface HypermocionesRuntimeEnv {
  DB?: Parameters<typeof drizzle>[0];
  API_FOOTBALL_API_KEY?: string;
  FOOTBALL_SEASON?: string;
}

export async function getRuntimeEnv(): Promise<HypermocionesRuntimeEnv> {
  try {
    const cloudflare = await import("cloudflare:workers");
    return cloudflare.env;
  } catch {
    return {
      API_FOOTBALL_API_KEY: process.env.API_FOOTBALL_API_KEY,
      FOOTBALL_SEASON: process.env.FOOTBALL_SEASON,
    };
  }
}
