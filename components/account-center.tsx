"use client";

import { useEffect, useState } from "react";

import { createBackup, isHypermocionesStorageKey, parseBackup } from "@/domain/local-backup";
import { defaultPreferences, preferencesStorageKey } from "@/domain/preferences";

interface Profile {
  email: string;
  displayName: string;
  onboardingCompleted: boolean;
  preferences: { defaultRound?: number; compactMode?: boolean; reducedMotion?: boolean };
}

export function AccountCenter({ email, initialName, signOutHref }: { email: string; initialName: string; signOutHref: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState("Cargando tu cuenta…");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/account", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/account/snapshot", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([accountResult, snapshotResult]) => {
      if (accountResult.profile) {
        setProfile(accountResult.profile);
        setName(accountResult.profile.displayName);
        setMessage("Cuenta conectada.");
      } else setMessage(accountResult.error ?? "No se pudo cargar la cuenta.");
      setSnapshotUpdatedAt(snapshotResult.snapshot?.updatedAt ?? null);
    }).catch(() => setMessage("No se pudo conectar con la cuenta."));
  }, []);

  const saveProfile = async () => {
    setBusy(true);
    const response = await fetch("/api/account", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: name, onboardingCompleted: profile?.onboardingCompleted ?? false, preferences: profile?.preferences ?? {} }) });
    const result = await response.json();
    if (response.ok) { setProfile(result.profile); persistLocalPreferences(result.profile.preferences, result.profile.onboardingCompleted); setMessage("Perfil y preferencias actualizados."); }
    else setMessage(result.error ?? "No se pudo actualizar el perfil.");
    setBusy(false);
  };

  const updatePreference = (key: "compactMode" | "reducedMotion", value: boolean) => {
    setProfile((current) => current ? { ...current, preferences: { ...current.preferences, [key]: value } } : current);
  };

  const uploadSnapshot = async () => {
    setBusy(true);
    const entries = Object.keys(localStorage).filter(isHypermocionesStorageKey).map((key) => [key, localStorage.getItem(key) ?? ""] as [string, string]);
    const backup = createBackup(entries);
    const response = await fetch("/api/account/snapshot", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(backup) });
    const result = await response.json();
    if (response.ok) { setSnapshotUpdatedAt(result.updatedAt); setMessage("Copia sincronizada con tu cuenta."); }
    else setMessage(result.error ?? "No se pudo sincronizar la copia.");
    setBusy(false);
  };

  const restoreSnapshot = async () => {
    setBusy(true);
    const response = await fetch("/api/account/snapshot", { cache: "no-store" });
    const result = await response.json();
    const backup = parseBackup(result.snapshot?.backup);
    if (response.ok && backup) {
      for (const [key, value] of Object.entries(backup.entries)) localStorage.setItem(key, value);
      window.dispatchEvent(new Event("hypermociones:data-restored"));
      setMessage("Copia restaurada en este dispositivo. Recarga las herramientas abiertas.");
    } else setMessage(result.error ?? "No existe una copia compatible.");
    setBusy(false);
  };

  const removeAccount = async () => {
    if (confirmDelete !== "ELIMINAR") { setMessage("Escribe ELIMINAR para confirmar."); return; }
    setBusy(true);
    const response = await fetch("/api/account", { method: "DELETE" });
    const result = await response.json();
    if (response.ok) window.location.href = signOutHref;
    else { setMessage(result.error ?? "No se pudo eliminar la cuenta."); setBusy(false); }
  };

  return <div className="account-grid">
    <section className="panel account-profile">
      <p className="eyebrow">Identidad</p><h2>Tu perfil</h2>
      <label><span>Correo</span><input disabled value={email} /></label>
      <label><span>Nombre visible</span><input maxLength={60} minLength={2} onChange={(event) => setName(event.target.value)} value={name} /></label>
      <fieldset><legend>Preferencias de lectura</legend><label className="account-check"><input checked={profile?.preferences.compactMode === true} onChange={(event) => updatePreference("compactMode", event.target.checked)} type="checkbox" />Vista compacta</label><label className="account-check"><input checked={profile?.preferences.reducedMotion === true} onChange={(event) => updatePreference("reducedMotion", event.target.checked)} type="checkbox" />Reducir movimiento</label></fieldset>
      <button className="button button-primary" disabled={busy || name.trim().length < 2} onClick={() => void saveProfile()} type="button">Guardar perfil</button>
    </section>
    <section className="panel account-sync">
      <p className="eyebrow">Sincronización opcional</p><h2>Tu espacio en todos tus dispositivos</h2>
      <p>Guarda una copia cifrada en tránsito de Mi equipo, alineaciones, seguimiento, mercado y planes. La copia local seguirá funcionando sin conexión.</p>
      <p><strong>{snapshotUpdatedAt ? `Última copia: ${new Date(snapshotUpdatedAt).toLocaleString("es-ES")}` : "Todavía no hay copia remota"}</strong></p>
      <div><button className="button button-primary" disabled={busy} onClick={() => void uploadSnapshot()} type="button">Sincronizar este dispositivo</button><button className="button" disabled={busy || !snapshotUpdatedAt} onClick={() => void restoreSnapshot()} type="button">Restaurar aquí</button></div>
    </section>
    <section className="panel account-session">
      <p className="eyebrow">Sesión</p><h2>Acceso</h2><p>La identidad se gestiona mediante ChatGPT. Hypermociones no almacena contraseñas.</p><a className="button" href={signOutHref}>Cerrar sesión</a>
    </section>
    <section className="panel danger-zone account-danger">
      <p className="eyebrow">Zona sensible</p><h2>Eliminar cuenta</h2><p>Elimina el perfil y la copia sincronizada. Los datos locales de este navegador no se borran automáticamente.</p>
      <label><span>Escribe ELIMINAR</span><input onChange={(event) => setConfirmDelete(event.target.value)} value={confirmDelete} /></label>
      <button className="button danger" disabled={busy} onClick={() => void removeAccount()} type="button">Eliminar cuenta y copia</button>
    </section>
    <p className="account-message" role="status" aria-live="polite">{message}</p>
  </div>;
}

function persistLocalPreferences(preferences: Profile["preferences"], onboardingCompleted: boolean) {
  localStorage.setItem(preferencesStorageKey, JSON.stringify({ ...defaultPreferences(), ...preferences, onboardingCompleted, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event("hypermociones:preferences-changed"));
}
