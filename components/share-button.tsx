"use client";

import { notifyProduct } from "@/domain/product-events";

export function ShareButton({ title = "Hypermociones", text = "Consulta esta decisión en Hypermociones", className = "shell-icon-button" }: { title?: string; text?: string; className?: string }) {
  const share = async () => {
    const data = { title, text, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(`${text}\n${window.location.href}`); notifyProduct("Enlace copiado al portapapeles."); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notifyProduct("No se pudo compartir el enlace.", "error");
    }
  };
  return <button aria-label="Compartir esta página" className={className} onClick={() => void share()} title="Compartir" type="button">Compartir</button>;
}
