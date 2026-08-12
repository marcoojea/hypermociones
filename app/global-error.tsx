"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="es"><body><main className="fatal-state"><span>!</span><h1>Hypermociones necesita reiniciarse</h1><p>Tu estado local permanece en el navegador.</p><button type="button" onClick={reset}>Reintentar</button></main></body></html>;
}
