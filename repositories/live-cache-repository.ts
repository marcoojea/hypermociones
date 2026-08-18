import { eq } from "drizzle-orm";

import { getSiteDb } from "@/db/site";
import { liveFeedCache } from "@/db/site-schema";
import { isLiveFeed, type LiveFeed } from "@/domain/live";

const CACHE_KEY = "hypermotion-2026-live";

export async function getCachedLiveFeed() {
  try {
    const db = await getSiteDb();
    const [row] = await db.select().from(liveFeedCache).where(eq(liveFeedCache.cacheKey, CACHE_KEY)).limit(1);
    if (!row) return null;
    const parsed: unknown = JSON.parse(row.payloadJson);
    return isLiveFeed(parsed) ? { feed: parsed, expiresAt: row.expiresAt } : null;
  } catch {
    return null;
  }
}

export async function saveCachedLiveFeed(feed: LiveFeed) {
  try {
    const db = await getSiteDb();
    const expiresAt = new Date(new Date(feed.fetchedAt).getTime() + feed.refreshAfterSeconds * 1_000).toISOString();
    await db.insert(liveFeedCache).values({ cacheKey: CACHE_KEY, provider: feed.provider, payloadJson: JSON.stringify(feed), fetchedAt: feed.fetchedAt, expiresAt }).onConflictDoUpdate({ target: liveFeedCache.cacheKey, set: { provider: feed.provider, payloadJson: JSON.stringify(feed), fetchedAt: feed.fetchedAt, expiresAt, updatedAt: new Date().toISOString() } });
  } catch {
    // Local development can run without D1; the provider response remains usable.
  }
}
