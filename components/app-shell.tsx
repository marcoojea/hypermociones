import Link from "next/link";

import { getChatGPTUser } from "@/app/chatgpt-auth";
import { GlobalSearch } from "@/components/global-search";
import { InstallApp } from "@/components/install-app";
import { ShareButton } from "@/components/share-button";
import { ToastCenter } from "@/components/toast-center";
import { ProductRuntime } from "@/components/product-runtime";
import { playerRepository } from "@/repositories/snapshot-player-repository";

const nav = [
  ["dashboard", "/", "Resumen"], ["gameweek", "/gameweek", "Jornada"], ["tiers", "/tiers", "Tiers"],
  ["players", "/players", "Jugadores"], ["rankings", "/rankings", "Rankings"],
  ["my-team", "/my-team", "Mi equipo"], ["lineups", "/lineups", "Alineaciones"],
] as const;

const secondaryNav = [
  ["/compare", "Comparar"], ["/planner", "Planificador"], ["/watchlist", "Seguimiento"],
  ["/market", "Mercado"], ["/availability", "Disponibilidad"], ["/fixtures", "Partidos"],
  ["/teams", "Equipos"], ["/data-status", "Datos"],
] as const;

const legalNav = [
  ["/methodology", "Metodología"], ["/settings/data", "Datos locales"], ["/account", "Cuenta y sincronización"],
  ["/privacy", "Privacidad"], ["/terms", "Condiciones"], ["/contact", "Contacto"],
] as const;

export async function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  const [players, teams, provenance, user] = await Promise.all([
    playerRepository.findMany(),
    playerRepository.listTeams(),
    playerRepository.getProvenance(),
    getChatGPTUser(),
  ]);
  const importedAt = provenance.importedAt ? new Date(provenance.importedAt) : null;
  const importedLabel = importedAt ? importedAt.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : null;
  const stale = importedLabel === null;
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">H</span><span>HYPER<em>MOCIONES</em></span></Link>
        <nav aria-label="Navegación principal">
          {nav.map(([key, href, label]) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} href={href} key={key}>{label}</Link>)}
        </nav>
        <div className="shell-tools">
          <GlobalSearch players={players} teams={teams} />
          <ShareButton />
          <InstallApp />
          <Link aria-label={user ? `Cuenta de ${user.displayName}` : "Crear cuenta o acceder"} className="account-chip" href="/account"><span>{user ? user.displayName.slice(0, 1).toUpperCase() : "○"}</span><small>{user ? "Cuenta" : "Acceder"}</small></Link>
          <div className="round-pill"><span>J1</span><small>2026/27</small></div>
        </div>
      </header>
      <div className={`data-freshness ${stale ? "data-stale" : ""}`} role={stale ? "alert" : "status"}><span><i />{stale ? "Datos pendientes de actualización" : `Datos importados el ${importedLabel}`}</span><Link href="/data-status">Ver cobertura y fuentes →</Link></div>
      <main id="main-content">{children}</main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {nav.filter(([key]) => ["dashboard", "gameweek", "tiers", "my-team", "lineups"].includes(key)).map(([key, href, label]) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} href={href} key={key}>{label}</Link>)}
      </nav>
      <footer>
        <div className="footer-brand"><strong>HYPERMOCIONES</strong><span>Analytics Fantasy independiente · 2026</span></div>
        <div className="footer-links">
          <nav aria-label="Herramientas secundarias">{secondaryNav.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
          <nav aria-label="Información legal y soporte">{legalNav.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
        </div>
      </footer>
      <ToastCenter />
      <ProductRuntime />
    </div>
  );
}
