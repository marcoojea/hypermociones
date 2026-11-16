import { parseSummary, splitScoreboard, type EspnScoreboardMatch, type EspnSummary } from "@/domain/espn-soccer";

// Unofficial ESPN endpoints for LaLiga Hypermotion (esp.2). Approved by the owner; kept behind this route.
export const dynamic = "force-dynamic";

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.2/scoreboard";
const summaryUrl = (eventId: string) => `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.2/summary?event=${encodeURIComponent(eventId)}`;
const CACHE_MS = 30_000;
const PRE_MATCH_WINDOW_MS = 90 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const SOURCE = "ESPN (API no oficial)";

let scoreboardCache: { at: number; value: EspnScoreboardMatch[]; errors: string[] } | null = null;
const summaryCache = new Map<string, { at: number; value: EspnSummary }>();

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${new URL(url).pathname}`);
  return response.json();
}

// Lineups appear close to kickoff; live and finished matches need events.
function needsSummary(match: EspnScoreboardMatch, now: number) {
  if (match.state === "in" || match.state === "post") return true;
  if (match.state === "pre" && match.kickoffAt) return Date.parse(match.kickoffAt) - now < PRE_MATCH_WINDOW_MS;
  return false;
}

async function summaryFor(match: EspnScoreboardMatch, now: number): Promise<{ summary: EspnSummary | null; summaryAt: string | null; error: string | null }> {
  if (!needsSummary(match, now)) return { summary: null, summaryAt: null, error: null };
  const cached = summaryCache.get(match.espnId);
  if (cached && now - cached.at <= CACHE_MS) return { summary: cached.value, summaryAt: new Date(cached.at).toISOString(), error: null };
  try {
    const summary = parseSummary(await getJson(summaryUrl(match.espnId)));
    if (summaryCache.size > 200) summaryCache.clear();
    summaryCache.set(match.espnId, { at: now, value: summary });
    return { summary, summaryAt: new Date(now).toISOString(), error: null };
  } catch (error) {
    // One failed match must not hide the others, but the cause must be visible.
    const message = error instanceof Error ? error.message : "error desconocido";
    console.error(`[live-matches] resumen ${match.espnId}: ${message}`);
    return { summary: null, summaryAt: null, error: message };
  }
}

export async function GET() {
  const now = Date.now();
  try {
    if (!scoreboardCache || now - scoreboardCache.at > CACHE_MS) {
      const { matches, errors } = splitScoreboard(await getJson(SCOREBOARD_URL));
      for (const error of errors) console.error(`[live-matches] marcador ${error}`);
      scoreboardCache = { at: now, value: matches, errors };
    }
    const matches = await Promise.all(scoreboardCache.value.map(async (match) => ({ ...match, ...(await summaryFor(match, now)) })));
    return Response.json({
      status: "OK",
      // The scoreboard time, not the request time: cached data must show its real age.
      fetchedAt: new Date(scoreboardCache.at).toISOString(),
      source: SOURCE,
      errors: scoreboardCache.errors,
      matches,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "error desconocido";
    console.error(`[live-matches] marcador no disponible: ${message}`);
    return Response.json({ status: "UNAVAILABLE", fetchedAt: new Date(now).toISOString(), source: SOURCE, message: `No se pudo obtener el directo (${message}).`, errors: [], matches: [] }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
