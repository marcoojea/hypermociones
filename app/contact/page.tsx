import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Contacto y correcciones",
  description: "Canal de contacto, incidencias y correcciones de datos de Hypermociones.",
};

export default function ContactPage() {
  return (
    <AppShell active="contact">
      <article className="legal-page">
        <header>
          <p className="eyebrow">Soporte transparente</p>
          <h1>Contacto y correcciones</h1>
          <p>Usamos el repositorio público para que cada incidencia tenga contexto, seguimiento y resolución verificable.</p>
        </header>
        <section>
          <h2>Comunicar un error</h2>
          <p>Abre una incidencia indicando la página, el dato que debe revisarse y, cuando sea posible, una fuente pública que permita comprobarlo.</p>
          <p><a href="https://github.com/marcoojea/hypermociones/issues/new" rel="noreferrer" target="_blank">Abrir una incidencia en GitHub</a></p>
        </section>
        <section>
          <h2>Seguridad y privacidad</h2>
          <p>No publiques claves, datos personales ni información privada. Los avisos de seguridad deben enviarse mediante el canal privado del repositorio.</p>
          <p><a href="https://github.com/marcoojea/hypermociones/security/advisories/new" rel="noreferrer" target="_blank">Informar de una vulnerabilidad en privado</a></p>
        </section>
        <section>
          <h2>Alcance</h2>
          <p>Hypermociones es un proyecto independiente. El canal sirve para incidencias del producto; no representa a LALIGA, la RFEF, clubes ni proveedores Fantasy.</p>
        </section>
      </article>
    </AppShell>
  );
}
