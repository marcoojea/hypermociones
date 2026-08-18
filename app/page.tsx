import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { HomeWorkspace } from "@/components/home-workspace";
import { fixtureRepository } from "@/repositories/fixture-repository";
import { playerRepository } from "@/repositories/snapshot-player-repository";

export const metadata: Metadata = { title: "Panel de jugadores" };

export default async function Home() {
  const [players, provenance, fixtures] = await Promise.all([
    playerRepository.findMany({ sort: "fis", direction: "desc" }),
    playerRepository.getProvenance(),
    fixtureRepository.findAll(),
  ]);
  const ranked = players.filter((player) => player.fis !== null);
  const featured = (ranked.length ? ranked : players).slice(0, 3);
  const importedLabel = provenance.importedAt ? new Date(provenance.importedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "pendiente";

  return (
    <AppShell active="dashboard">
      <section className="hero">
        <div>
          <p className="eyebrow">Temporada {provenance.season} · {provenance.mode === "REAL" ? `Datos reales · ${provenance.provider}` : "Modo demostración"}</p>
          <h1>Decisiones Fantasy,<br /><span>respaldadas por datos.</span></h1>
          <p className="hero-copy">Compara forma, minutos, producción ofensiva y contexto de partido en una sola lectura.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/gameweek">Preparar jornada →</Link>
            <Link className="button" href="/tiers">Ver Tier list</Link>
            <Link className="button" href="/my-team">Crear Mi equipo</Link>
            <Link className="data-note" href="/data-status"><i /> Fuente verificable · actualizado {importedLabel}</Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="Resumen de la jornada">
          <div className="metric"><span>Jugadores analizados</span><strong>{players.length}</strong><small>catálogo {provenance.season}</small></div>
          <div className="metric"><span>Equipos representados</span><strong>{new Set(players.map((player) => player.team.id)).size}</strong><small>{provenance.provider}</small></div>
          <div className="metric metric-accent"><span>Mejor FIS</span><strong>{featured[0]?.fis?.toFixed(1) ?? "—"}</strong><small>{ranked.length ? featured[0]?.name : "Pendiente de modelo"}</small></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Radar de oportunidad</p><h2>Jugadores a seguir</h2></div><Link href="/players">Ver tabla completa →</Link></div>
        <div className="player-cards">
          {featured.map((player, index) => (
            <Link className="player-card" href={`/player/${player.slug}`} key={player.id}>
              <div className="card-rank">0{index + 1}</div>
              <div className="card-main"><span className="position-badge">{player.position}</span><h3>{player.name}</h3><p>{player.team.shortName} · {player.nextOpponent}</p></div>
              <div className="fis-orbit"><strong>{player.fis?.toFixed(0) ?? "—"}</strong><span>FIS</span></div>
              <div className="card-stats"><span><small>Forma</small><b>{player.form?.toFixed(1) ?? "—"}</b></span><span><small>Min.</small><b>{player.minutes ?? "—"}</b></span><span><small>xGI</small><b>{player.xgi?.toFixed(2) ?? "—"}</b></span></div>
            </Link>
          ))}
        </div>
      </section>

      <HomeWorkspace fixtures={fixtures} players={players} />

      <section className="home-trust" aria-labelledby="home-trust-title">
        <div><p className="eyebrow">Transparencia operativa</p><h2 id="home-trust-title">Datos identificados. Ausencias visibles. Control local.</h2></div>
        <div className="trust-points">
          <p><strong>Sin métricas inventadas</strong><span>Los campos sin fuente permanecen como no disponibles.</span></p>
          <p><strong>Fuentes y fechas visibles</strong><span>La cobertura y la última importación pueden comprobarse.</span></p>
          <p><strong>Privacidad por diseño</strong><span>El modo invitado permanece local; la cuenta y la sincronización son opcionales.</span></p>
        </div>
        <div className="trust-actions"><Link className="button" href="/data-status">Estado de los datos</Link><Link className="button" href="/privacy">Privacidad</Link><Link className="button" href="/contact">Correcciones y soporte</Link></div>
      </section>
    </AppShell>
  );
}
