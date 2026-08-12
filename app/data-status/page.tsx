import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getDataStatus } from "@/repositories/data-status-repository";

export const metadata: Metadata = {
  title: "Estado de los datos",
  description: "Frescura, cobertura y limitaciones del catálogo de Hypermociones.",
};

export default function DataStatusPage() {
  const status = getDataStatus();
  const importedAt = status.importedAt ? new Date(status.importedAt).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" }) : "Pendiente";
  return (
    <AppShell active="data-status">
      <section className="data-status-hero">
        <div><p className="eyebrow">Transparencia operativa</p><h1>Estado de los datos</h1><p>Qué contiene el catálogo, cuándo se actualizó y qué métricas siguen sin una fuente autorizada.</p></div>
        <div className={`freshness freshness-${status.freshness.level.toLowerCase()}`}><i /><span>{status.freshness.label}</span><small>{status.provider}</small></div>
      </section>
      <div className="data-status-kpis">
        <div><span>Equipos</span><strong>{status.teams}</strong></div><div><span>Histórico real</span><strong>{status.intelligence.historicalPlayers}</strong></div><div><span>Valores vigentes</span><strong>{status.intelligence.currentMarketValues}</strong></div><div><span>Temporada base</span><strong>{status.intelligence.performanceSeason ?? "—"}</strong></div>
      </div>
      <div className="data-status-grid">
        <section className="panel"><p className="eyebrow">Cobertura por campo</p><h2>Datos disponibles</h2><div className="coverage-list">{status.coverage.map((metric) => <div key={metric.key}><span><strong>{metric.label}</strong><small>{metric.available} de {metric.total}</small></span><span aria-label={`Cobertura de ${metric.label}`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={metric.percentage} className="coverage-track" role="progressbar"><i style={{ width: `${metric.percentage}%` }} /></span><b>{metric.percentage}%</b></div>)}</div></section>
        <section className="panel"><p className="eyebrow">Procedencia</p><h2>Última importación</h2><dl className="data-facts"><div><dt>Proveedor</dt><dd>{status.provider}</dd></div><div><dt>Fecha</dt><dd>{importedAt}</dd></div><div><dt>Modo</dt><dd>{status.mode === "REAL" ? "Catálogo real" : "Demostración"}</dd></div></dl><p className="data-status-note">La fecha indica cuándo se creó el snapshot incluido en esta versión, no una actualización en tiempo real.</p><h3>No disponibles automáticamente</h3><div className="unavailable-tags">{status.unavailableMetrics.map((metric) => <span key={metric}>{metric}</span>)}</div></section>
      </div>
    </AppShell>
  );
}
