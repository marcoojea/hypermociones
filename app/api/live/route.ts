import { getRuntimeEnv } from "@/db/runtime-env";
import { buildVerifiedResultsFallback } from "@/data/live-fallback";
import type { LiveFeed } from "@/domain/live";
import { ApiFootballLiveProvider, isLiveProviderAccessError } from "@/providers/football/api-football-live";
import { getCachedLiveFeed, saveCachedLiveFeed } from "@/repositories/live-cache-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const cached = await getCachedLiveFeed();
  if (cached && new Date(cached.expiresAt).getTime() > now.getTime()) return liveResponse(cached.feed, "HIT");

  const env = await getRuntimeEnv();
  const apiKey = env.API_FOOTBALL_API_KEY;
  const season = Number(env.FOOTBALL_SEASON ?? "2026");
  if (!apiKey) return liveResponse(cached ? { ...cached.feed, stale: true, message: "Se muestra la última captura porque falta la credencial live." } : buildVerifiedResultsFallback("Falta configurar el proveedor live."), cached ? "STALE" : "MISS");

  try {
    const feed = await new ApiFootballLiveProvider(apiKey).getFeed(season, now);
    await saveCachedLiveFeed(feed);
    return liveResponse(feed, "MISS");
  } catch (error) {
    console.error("[hypermociones/live] Fallo al refrescar proveedor", safeErrorDetails(error));
    const message = isLiveProviderAccessError(error)
      ? "La suscripción configurada no incluye la temporada actual de LALIGA HYPERMOTION."
      : isNetworkError(error)
        ? "No se pudo conectar con el proveedor live desde este entorno. Comprueba la red o el firewall y vuelve a intentarlo."
        : "No se pudo obtener una captura válida. Revisa la cobertura 2026/27 y el estado del proveedor live.";
    return liveResponse(cached ? { ...cached.feed, stale: true, message: `${message} Se conserva la última captura.` } : buildVerifiedResultsFallback(message), cached ? "STALE" : "MISS");
  }
}

function safeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { type: typeof error };
  return { name: error.name, code: "code" in error ? String(error.code) : null, message: error.message.slice(0, 300) };
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError && /fetch failed|network|socket|connect/i.test(error.message);
}

function liveResponse(feed: LiveFeed, cache: "HIT" | "MISS" | "STALE") {
  return Response.json(feed, { headers: { "cache-control": "public, max-age=15, stale-while-revalidate=45", "x-hypermociones-live-cache": cache } });
}
