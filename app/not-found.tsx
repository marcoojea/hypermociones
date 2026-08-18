import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return <AppShell active=""><div className="not-found"><p className="eyebrow">Error 404</p><h1>Esta página no está disponible</h1><p>La dirección puede haber cambiado o el contenido ya no existe. Puedes volver al inicio o continuar explorando el catálogo.</p><div><Link className="button button-primary" href="/">Volver al inicio</Link><Link className="button" href="/players">Explorar jugadores</Link><Link className="button" href="/teams">Ver equipos</Link></div></div></AppShell>;
}
