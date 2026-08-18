import { getChatGPTUser } from "@/app/chatgpt-auth";
import { forbiddenMutation, isSameOriginMutation } from "@/app/api/request-security";
import { parseBackup } from "@/domain/local-backup";
import { deleteAccountSnapshot, getAccountSnapshot, saveAccountSnapshot } from "@/repositories/account-repository";

export const dynamic = "force-dynamic";
const MAX_PAYLOAD_BYTES = 2_000_000;

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  try {
    const snapshot = await getAccountSnapshot(user.userId);
    return Response.json({ snapshot: snapshot ? { backup: JSON.parse(snapshot.payloadJson), updatedAt: snapshot.updatedAt } : null });
  } catch {
    return Response.json({ error: "No se pudo recuperar la copia sincronizada." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return forbiddenMutation();
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_PAYLOAD_BYTES) return Response.json({ error: "La copia supera el límite de 2 MB." }, { status: 413 });
    const backup = parseBackup(JSON.parse(raw));
    if (!backup) return Response.json({ error: "La copia no tiene un formato compatible." }, { status: 400 });
    const saved = await saveAccountSnapshot(user, JSON.stringify(backup));
    return Response.json({ saved: true, updatedAt: saved.updatedAt });
  } catch {
    return Response.json({ error: "No se pudo sincronizar la copia." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return forbiddenMutation();
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  try {
    await deleteAccountSnapshot(user.userId);
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar la copia sincronizada." }, { status: 500 });
  }
}
