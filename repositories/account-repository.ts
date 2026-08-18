import { eq } from "drizzle-orm";

import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { getSiteDb } from "@/db/site";
import { accountProfiles, accountSnapshots } from "@/db/site-schema";

export interface AccountPreferences {
  defaultRound?: number;
  compactMode?: boolean;
  reducedMotion?: boolean;
}

export async function ensureAccount(user: ChatGPTUser) {
  const db = await getSiteDb();
  await db.insert(accountProfiles).values({
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
  }).onConflictDoUpdate({
    target: accountProfiles.userId,
    set: { email: user.email, updatedAt: new Date().toISOString() },
  });
  return getAccount(user.userId);
}

export async function getAccount(userId: string) {
  const db = await getSiteDb();
  const [profile] = await db.select().from(accountProfiles).where(eq(accountProfiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function updateAccount(user: ChatGPTUser, input: { displayName: string; onboardingCompleted: boolean; preferences: AccountPreferences }) {
  await ensureAccount(user);
  const db = await getSiteDb();
  await db.update(accountProfiles).set({
    displayName: input.displayName,
    onboardingCompleted: input.onboardingCompleted,
    preferencesJson: JSON.stringify(input.preferences),
    updatedAt: new Date().toISOString(),
  }).where(eq(accountProfiles.userId, user.userId));
  return getAccount(user.userId);
}

export async function deleteAccount(userId: string) {
  const db = await getSiteDb();
  await db.delete(accountSnapshots).where(eq(accountSnapshots.userId, userId));
  await db.delete(accountProfiles).where(eq(accountProfiles.userId, userId));
}

export async function getAccountSnapshot(userId: string) {
  const db = await getSiteDb();
  const [snapshot] = await db.select().from(accountSnapshots).where(eq(accountSnapshots.userId, userId)).limit(1);
  return snapshot ?? null;
}

export async function saveAccountSnapshot(user: ChatGPTUser, payloadJson: string) {
  await ensureAccount(user);
  const db = await getSiteDb();
  const updatedAt = new Date().toISOString();
  await db.insert(accountSnapshots).values({ userId: user.userId, payloadJson, updatedAt }).onConflictDoUpdate({
    target: accountSnapshots.userId,
    set: { payloadJson, updatedAt },
  });
  return { updatedAt };
}

export async function deleteAccountSnapshot(userId: string) {
  const db = await getSiteDb();
  await db.delete(accountSnapshots).where(eq(accountSnapshots.userId, userId));
}
