"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="es"><body><main className="fatal-state"><span>!</span><p className="eyebrow">Error inesperado</p><h1>Hypermociones necesita reiniciarse</h1><p>Tu estado local permanece en el navegador. Reintenta antes de recargar o cerrar esta pestaña.</p><div><button className="button button-primary" type="button" onClick={reset}>Reintentar</button></div></main></body></html>;
}
