import type { SyncInjury, SyncNewsArticle } from "@/data/espn-segunda-types";

const stamp = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function NewsCenter({ articles, newsFetchedAt, injuries, injuriesFetchedAt }: {
  articles: SyncNewsArticle[];
  newsFetchedAt: string;
  injuries: SyncInjury[];
  injuriesFetchedAt: string;
}) {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">Noticias · LaLiga Hypermotion 2026/27</p>
          <h1>Noticias</h1>
          <p>Titulares publicados por ESPN. Los avisos de lesión salen de palabras clave y siguen pendientes de confirmar.</p>
        </div>
        <div className="header-stat"><strong>{articles.length}</strong><span>titulares</span></div>
      </section>

      <div className="data-heading"><h2>Titulares</h2><span>ESPN · {stamp(newsFetchedAt)}</span></div>
      {articles.length === 0 ? (
        <p className="legal-note" role="status">ESPN no ha publicado titulares de Segunda todavía.</p>
      ) : (
        <ol className="news-list">
          {articles.map((article) => (
            <li key={`${article.published}|${article.headline}`}>
              <div className="news-meta">
                <time dateTime={article.published}>{stamp(article.published)}</time>
                {article.injuryCandidate ? <span className="news-badge">Pendiente de confirmar</span> : null}
              </div>
              <h3>
                {article.link ? <a href={article.link} rel="noopener noreferrer" target="_blank">{article.headline}</a> : article.headline}
              </h3>
            </li>
          ))}
        </ol>
      )}

      <div className="data-heading"><h2>Lesiones</h2><span>ESPN · {stamp(injuriesFetchedAt)}</span></div>
      {injuries.length === 0 ? (
        <p className="legal-note" role="status">ESPN no reporta lesiones en Segunda (fuente sin verificar). Consultado: {stamp(injuriesFetchedAt)}.</p>
      ) : (
        <>
          <div className="table-shell">
            <table>
              <thead>
                <tr><th scope="col">Equipo</th><th scope="col">Jugador</th><th scope="col">Estado</th><th scope="col">Detalle</th></tr>
              </thead>
              <tbody>
                {injuries.map((injury) => (
                  <tr key={`${injury.teamName}|${injury.name}`}>
                    <td>{injury.teamName}</td>
                    <th scope="row">{injury.name}</th>
                    <td>{injury.status}</td>
                    <td>{injury.detail ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="legal-note">Fuente: ESPN (API no oficial), sin verificar. Consultado: {stamp(injuriesFetchedAt)}.</p>
        </>
      )}
    </>
  );
}
