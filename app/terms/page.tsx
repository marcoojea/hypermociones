import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Condiciones de uso", description: "Condiciones y límites de la información ofrecida por Hypermociones." };

export default function TermsPage() {
  return <AppShell active="terms"><article className="legal-page"><header><p className="eyebrow">Versión inicial · 12 de agosto de 2026</p><h1>Condiciones de uso</h1><p>Hypermociones es una herramienta independiente de análisis y organización Fantasy.</p></header><section><h2>Información, no garantía</h2><p>Las alineaciones, índices y recomendaciones son ayudas a la decisión. No garantizan titularidad, rendimiento, puntuación ni resultados. Las decisiones Fantasy siguen siendo responsabilidad del usuario.</p></section><section><h2>Procedencia y entradas manuales</h2><p>La aplicación identifica las fuentes y diferencia los datos importados de las entradas manuales. Consulta la <Link href="/methodology">metodología</Link> para conocer cobertura y limitaciones.</p></section><section><h2>Uso de terceros</h2><p>Las marcas, competiciones y clubes pertenecen a sus titulares. El producto no afirma afiliación oficial. No se deben importar contenidos ni datos sin los permisos correspondientes.</p></section><section><h2>Disponibilidad del servicio</h2><p>Durante la fase previa al lanzamiento pueden cambiar funciones, datos y formatos de almacenamiento. Las exportaciones JSON permiten conservar el trabajo local.</p></section><p className="legal-note">Borrador técnico sujeto a revisión jurídica antes de abrir el producto al público.</p></article></AppShell>;
}
