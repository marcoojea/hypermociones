import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return <AppShell active="players"><div className="not-found"><p className="eyebrow">Error 404</p><h1>Jugador no encontrado</h1><p>La ficha solicitada no existe en el conjunto de datos actual.</p><Link className="button button-primary" href="/players">Volver a jugadores</Link></div></AppShell>;
}
