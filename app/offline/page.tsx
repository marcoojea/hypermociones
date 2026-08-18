import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return <main className="offline-page"><span className="brand-mark">H</span><p className="eyebrow">Sin conexión</p><h1>Tu trabajo local sigue a salvo.</h1><p>Cuando recuperes la conexión podrás consultar de nuevo jugadores, partidos y fuentes. Los datos ya guardados permanecen en este dispositivo.</p><Link className="button button-primary" href="/">Volver a intentarlo</Link></main>;
}
