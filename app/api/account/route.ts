import { getChatGPTUser } from "@/app/chatgpt-auth";
import { forbiddenMutation, isSameOriginMutation } from "@/app/api/request-security";
import { deleteAccount, ensureAccount, updateAccount, type AccountPreferences } from "@/repositories/account-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  try {
    const profile = await ensureAccount(user);
    return Response.json({ profile: serializeProfile(profile) });
  } catch {
    return Response.json({ error: "La cuenta no está disponible temporalmente." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return forbiddenMutation();
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  try {
    const body = await request.json() as { displayName?: unknown; onboardingCompleted?: unknown; preferences?: unknown };
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 2 || displayName.length > 60) return Response.json({ error: "El nombre debe tener entre 2 y 60 caracteres." }, { status: 400 });
    const preferences = validPreferences(body.preferences);
    if (!preferences) return Response.json({ error: "Las preferencias no son válidas." }, { status: 400 });
    const profile = await updateAccount(user, { displayName, onboardingCompleted: body.onboardingCompleted === true, preferences });
    return Response.json({ profile: serializeProfile(profile) });
  } catch {
    return Response.json({ error: "No se pudo actualizar la cuenta." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return forbiddenMutation();
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  try {
    await deleteAccount(user.userId);
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar la cuenta." }, { status: 500 });
  }
}

function validPreferences(value: unknown): AccountPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const result: AccountPreferences = {};
  if (input.defaultRound !== undefined) {
    if (!Number.isInteger(input.defaultRound) || Number(input.defaultRound) < 1 || Number(input.defaultRound) > 100) return null;
    result.defaultRound = Number(input.defaultRound);
  }
  if (input.compactMode !== undefined) result.compactMode = input.compactMode === true;
  if (input.reducedMotion !== undefined) result.reducedMotion = input.reducedMotion === true;
  return result;
}

function serializeProfile(profile: Awaited<ReturnType<typeof ensureAccount>>) {
  if (!profile) return null;
  let preferences: AccountPreferences = {};
  try { preferences = JSON.parse(profile.preferencesJson) as AccountPreferences; } catch { /* Use safe defaults. */ }
  return { ...profile, preferences, preferencesJson: undefined };
}
