"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="fatal-state"><span>!</span><p className="eyebrow">Error recuperable</p><h1>No hemos podido cargar esta vista</h1><p>Tu información local no se ha borrado. Puedes reintentar o volver al inicio.</p><div><button className="button button-primary" type="button" onClick={reset}>Reintentar</button><Link className="button" href="/">Volver al inicio</Link></div></main>;
}
