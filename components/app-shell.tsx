import Link from "next/link";

const nav = [
  ["dashboard", "/", "Resumen"], ["gameweek", "/gameweek", "Jornada"], ["tiers", "/tiers", "Tiers"],
  ["players", "/players", "Jugadores"], ["rankings", "/rankings", "Rankings"],
  ["my-team", "/my-team", "Mi equipo"], ["lineups", "/lineups", "Alineaciones"],
] as const;

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">H</span><span>HYPER<em>MOCIONES</em></span></Link>
        <nav aria-label="Navegación principal">
          {nav.map(([key, href, label]) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} href={href} key={key}>{label}</Link>)}
        </nav>
        <div className="round-pill"><span>J1</span><small>2026/27</small></div>
      </header>
      <main id="main-content">{children}</main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {nav.filter(([key]) => ["dashboard", "gameweek", "tiers", "my-team", "lineups"].includes(key)).map(([key, href, label]) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} href={href} key={key}>{label}</Link>)}
      </nav>
      <footer><span>HYPERMOCIONES · ANALYTICS LAB</span><span><Link href="/compare">Comparar</Link> · <Link href="/planner">Planificador</Link> · <Link href="/watchlist">Seguimiento</Link> · <Link href="/market">Mercado</Link> · <Link href="/availability">Disponibilidad</Link> · <Link href="/fixtures">Partidos</Link> · <Link href="/teams">Equipos</Link> · <Link href="/data-status">Datos</Link> · <Link href="/methodology">Metodología</Link> · <Link href="/settings/data">Privacidad local</Link></span></footer>
    </div>
  );
}
