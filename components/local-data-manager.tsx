"use client";

import { useEffect, useRef, useState } from "react";
import { backupCategory, createBackup, isHypermocionesStorageKey, parseBackup } from "@/domain/local-backup";

type LocalEntry = { key: string; bytes: number; category: string };

function readEntries(): LocalEntry[] {
  return Object.keys(localStorage).filter(isHypermocionesStorageKey).sort().map((key) => ({ key, bytes: new Blob([localStorage.getItem(key) ?? ""]).size, category: backupCategory(key) }));
}

export function LocalDataManager() {
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [message, setMessage] = useState("Los datos permanecen en este navegador.");
  const [confirmation, setConfirmation] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const refresh = () => setEntries(readEntries());
  useEffect(() => { const frame = window.requestAnimationFrame(refresh); return () => window.cancelAnimationFrame(frame); }, []);
  const categories = new Map<string, number>();
  for (const entry of entries) categories.set(entry.category, (categories.get(entry.category) ?? 0) + 1);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);

  const exportAll = () => {
    const backup = createBackup(entries.map((entry) => [entry.key, localStorage.getItem(entry.key) ?? ""] as [string, string]));
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `hypermociones-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    setMessage(`${entries.length} registros exportados.`);
  };
  const importAll = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5_000_000) { setMessage("La copia supera el límite de 5 MB."); return; }
    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      if (!backup) throw new Error("La copia no es válida o contiene claves no permitidas.");
      for (const [key, value] of Object.entries(backup.entries)) localStorage.setItem(key, value);
      refresh(); setMessage(`${Object.keys(backup.entries).length} registros restaurados desde la copia del ${new Date(backup.exportedAt).toLocaleString("es-ES")}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo leer la copia."); }
  };
  const eraseAll = () => {
    if (confirmation !== "BORRAR") { setMessage("Escribe BORRAR exactamente para confirmar."); return; }
    for (const entry of entries) localStorage.removeItem(entry.key);
    setConfirmation(""); refresh(); setMessage("Todos los datos locales de Hypermociones se han eliminado de este navegador.");
  };

  return <><section className="data-vault-summary"><div><p className="eyebrow">Privacidad por diseño</p><h1>Datos locales</h1><p>Crea una copia completa de Mi equipo, disponibilidad y alineaciones antes de cambiar de navegador o borrar datos.</p></div><div><strong>{entries.length}</strong><span>registros</span><small>{(totalBytes / 1024).toFixed(1)} KB</small></div></section><div className="data-vault-grid"><section className="panel"><p className="eyebrow">Contenido del navegador</p><h2>Resumen</h2><div className="data-category-list">{["Mi equipo", "Disponibilidad", "Alineaciones"].map((category) => <div key={category}><span>{category}</span><strong>{categories.get(category) ?? 0}</strong></div>)}</div><p className="data-vault-message" role="status" aria-live="polite">{message}</p></section><section className="panel"><p className="eyebrow">Copia de seguridad</p><h2>Exportar y restaurar</h2><p>El archivo solo contiene el estado creado dentro de Hypermociones. No incluye cookies, historial ni datos de otros sitios.</p><div className="data-vault-actions"><button className="button button-primary" disabled={!entries.length} type="button" onClick={exportAll}>Exportar copia completa</button><button className="button" type="button" onClick={() => importRef.current?.click()}>Restaurar copia</button><input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => void importAll(event.target.files?.[0])} /></div></section><section className="panel danger-zone"><p className="eyebrow">Zona sensible</p><h2>Borrar este dispositivo</h2><p>Esta acción elimina todos los equipos, partes y alineaciones locales. Exporta antes si quieres conservarlos.</p><label><span>Escribe BORRAR para confirmar</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="button danger" type="button" onClick={eraseAll}>Eliminar todos los datos locales</button></section></div></>;
}
