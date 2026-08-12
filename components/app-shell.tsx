import Link from "next/link";

const nav = [
  ["dashboard", "/", "Resumen"], ["players", "/players", "Jugadores"],
  ["teams", "/teams", "Equipos"], ["availability", "/availability", "Disponibilidad"],
  ["my-team", "/my-team", "Mi equipo"], ["lineups", "/lineups", "Alineaciones"], ["fixtures", "/fixtures", "Partidos"],
] as const;

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">H</span><span>HYPER<em>MOCIONES</em></span></Link>
        <nav aria-label="Navegación principal">
          {nav.map(([key, href, label]) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} href={href} key={key}>{label}</Link>)}
        </nav>
        <div className="round-pill"><span>J1</span><small>2026/27</small></div>
      </header>
      <main>{children}</main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {nav.filter(([key]) => ["dashboard", "players", "my-team", "availability", "lineups"].includes(key)).map(([key, href, label]) => <Link aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} href={href} key={key}>{label === "Disponibilidad" ? "Estado" : label}</Link>)}
      </nav>
      <footer><span>HYPERMOCIONES · ANALYTICS LAB</span><span>Fuentes y estimaciones identificadas en cada vista · <Link href="/methodology">Metodología</Link></span></footer>
    </div>
  );
}
