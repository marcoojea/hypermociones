import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Privacidad", description: "Cómo trata Hypermociones los datos locales del usuario." };

export default function PrivacyPage() {
  return <AppShell active="privacy"><article className="legal-page"><header><p className="eyebrow">Versión inicial · 12 de agosto de 2026</p><h1>Privacidad</h1><p>Esta versión está diseñada para funcionar sin cuenta y minimizar la recogida de datos personales.</p></header><section><h2>Datos guardados</h2><p>Mi equipo, alineaciones, historial editorial, proyecciones, partes, seguimiento, escenarios y precios de mercado se guardan en el almacenamiento local del navegador. El servidor no recibe ese contenido mediante estas funciones.</p></section><section><h2>Copias y eliminación</h2><p>Puedes exportar una copia, restaurarla o borrar todos los datos locales desde <Link href="/settings/data">Datos locales</Link>. Borrar los datos del navegador también elimina ese estado.</p></section><section><h2>Fuentes externas</h2><p>Los enlaces a fuentes, GitHub u otros sitios tienen sus propias políticas. Hypermociones no controla el tratamiento realizado por esos servicios.</p></section><section><h2>Antes de añadir cuentas</h2><p>Si se incorporan autenticación, analítica o sincronización remota, esta política deberá actualizarse antes de activar esas funciones para usuarios.</p></section><p className="legal-note">Documento informativo de producto; debe someterse a revisión jurídica antes de un lanzamiento comercial.</p></article></AppShell>;
}
