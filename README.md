# Hypermociones

Plataforma de analytics Fantasy para LaLiga Hypermotion. Incluye jugadores y equipos reales 2026/27, calendario, fichas de club y un editor completo de alineaciones probables.

## Estado actual

- Dashboard de entrada orientado a jugadores y jornada.
- `/players`: búsqueda por nombre/equipo, filtros por equipo, posición y estado, y ordenación por métricas.
- `/player/{slug}`: perfil, estadísticas agregadas, tendencia reciente, señales positivas y riesgos.
- `/teams` y `/team/{slug}`: directorio de los 22 clubes, plantilla oficial, disponibilidad y próximo partido.
- `/lineups`: centro de alineaciones por jornada con once probable, banquillo y notas cuando existe una edición guardada.
- `/lineups/editor`: editor táctico con cinco formaciones, confianza por jugador, roles a balón parado, banquillo, notas e importación/exportación JSON.
- `/availability`: centro editorial de lesiones, dudas, sanciones y disponibilidad con fuente, grado de confirmación y regreso estimado.
- `/my-team`: plantilla Fantasy manual, reglas configurables y optimizador de once explicable por jornada.
- `/gameweek`: centro de jornada con cuenta atrás, partidos, cambios y alertas de Mi equipo.
- `/tiers`: Tier S+–C por posición basado en 2025/26, con probabilidad, impacto, relevancia, valor, filtro por equipo y seis órdenes distintos.
- `/rankings`: capitanes y mejores opciones evaluables por posición.
- `/compare`: comparación de hasta cuatro jugadores con calendario y recomendación.
- `/planner`: plantilla a cinco jornadas y hasta cinco simulaciones de fichaje.
- `/watchlist`: radar local de jugadores y alertas.
- `/market`: precios aportados por el usuario, variaciones y rentabilidad sin datos inventados.
- `/settings/data`: copia, restauración y borrado controlado de todo el estado guardado localmente.
- `/account`: acceso opcional con ChatGPT, perfil, preferencias y copia sincronizada entre dispositivos.
- Buscador global con `Ctrl/⌘ + K`, acciones rápidas, onboarding guiado, avisos de guardado e instalación PWA.
- `/fixtures`: calendario y resultados reales cuando existe una importación.
- `/data-status`: frescura, procedencia y cobertura exacta de cada grupo de métricas.
- `/api/health`: comprobación mínima del servicio y del catálogo, sin exponer estado personal.
- Dominio, repositorios e interfaces de proveedores separados de React.
- Esquema relacional PostgreSQL preparado para histórico, ingesta, features, predicciones y backtesting.
- Validación Zod de estadísticas entrantes y pruebas del dominio.

El editor y los partes de disponibilidad se guardan por jornada en el navegador: son gratuitos, no requieren cuenta y permiten exportar un JSON. Quien accede con ChatGPT puede sincronizar voluntariamente esa copia mediante la base D1 del despliegue. Las incidencias se reflejan en fichas de equipo, fichas de jugador y alineaciones. Los datos que la fuente no publica se muestran como no disponibles; la aplicación no inventa métricas ni probabilidades.

Mi equipo aplica reglas configurables —tamaño de plantilla, máximo por club, formaciones, banquillo y capitán—. El optimizador usa únicamente señales disponibles y las entradas manuales del usuario. Solo suma puntos esperados cuando los once titulares tienen una proyección introducida; de lo contrario muestra el resultado como pendiente.

## Desarrollo

Requisitos: Node.js 22.13 o superior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en la URL local indicada por el servidor.

## Prueba manual antes de publicar

1. Abre `/my-team` y pulsa **Cargar plantilla de prueba**.
2. Cambia formación, titularidad y reglas; comprueba que el once se recalcula.
3. Introduce proyección manual para los once y confirma que aparece el total.
4. Marca un titular como lesionado desde `/availability` y vuelve a Mi equipo: debe desaparecer del once.
5. Guarda, recarga la página y verifica que la plantilla permanece.
6. Entra en `/settings/data`, descarga una copia integral y comprueba que puede restaurarse.
7. Visita `/privacy`, `/terms`, `/contact`, `/methodology` y `/robots.txt`; antes de publicar, robots debe bloquear el rastreo.
8. Repite los flujos principales con la ventana estrecha y usa la navegación inferior móvil.
9. En `/tiers`, cambia de posición y equipo; ordena por recomendación, probabilidad, impacto, relevancia y valor. Abre “Por qué” y comprueba las fechas y fuentes.

## Cargar LaLiga Hypermotion 2026/27 gratis

El proveedor predeterminado lee el calendario y las plantillas mostradas actualmente en las fichas oficiales de la RFEF. No necesita registro ni clave privada. Ejecuta:

```bash
npm run data:fetch
npm run data:history
npm run data:intelligence
```

Los tres comandos actualizan el catálogo 2026/27, el histórico público 2025/26 y el contexto de valor de mercado. `npm run data:refresh` los ejecuta en orden. El histórico incluido cubre 529 de 567 jugadores actuales; los restantes permanecen NR si no existe otra señal suficiente. El valor de mercado siempre conserva su fecha y no se confunde con el precio de una liga Fantasy. Si existe `DATABASE_URL`, la primera ingesta también hace upsert en PostgreSQL.

Antes de una release, `npm run data:check` comprueba que existen los 22 equipos, un catálogo suficiente de jugadores, partidos y una importación con menos de ocho días. Si falla, la publicación debe detenerse y actualizar el snapshot.

También existe la acción manual **Refresh official data** en GitHub. Permite ejecutar la misma actualización sin configurar el ordenador y solo guarda un commit cuando el snapshot cambia.

Los proveedores opcionales pueden ampliar minutos, apariciones, titularidades, goles, asistencias, tiros y pases clave. xG/xA y los datos propios de LALIGA Fantasy permanecen ausentes hasta incorporar una fuente autorizada que los cubra.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:release
```

`check:release` ejecuta toda la validación en el mismo orden que GitHub. Consulta también [docs/release-checklist.md](docs/release-checklist.md) y la [ruta manual de 60 minutos](docs/manual-qa-60-min.md).

## Bases de datos

El modelo analítico usa PostgreSQL y Drizzle. Sus migraciones viven en `drizzle-postgres/`. Copia `.env.example` a `.env` cuando exista una instancia local. La ingesta persiste el snapshot mediante upserts idempotentes; la aplicación usa una proyección JSON generada para mantener el runtime web desacoplado de la conexión.

```bash
npm run db:generate
npm run db:migrate
```

Las cuentas y copias opcionales del sitio utilizan SQLite/D1. Su esquema está en `db/site-schema.ts` y las migraciones de despliegue en `drizzle/`:

```bash
npm run db:generate:site
```

El esquema preserva temporalidad mediante `player_teams`, snapshots Fantasy, estados con ventana de validez, features versionadas y predicciones por versión de modelo.

## Estructura

```text
app/             rutas y composición server-side
components/      presentación reutilizable
data/            seed de demostración y snapshot real generado
domain/          tipos y reglas puras
repositories/    puertos y adaptadores de consulta
providers/       contratos de football, fantasy y noticias
db/              esquemas PostgreSQL y SQLite/D1
docs/            arquitectura y evaluación de fuentes
tests/           pruebas de dominio y normalización
```

Más detalle en [docs/architecture.md](docs/architecture.md) y [docs/data-sources.md](docs/data-sources.md).

## Variables de entorno

| Variable | Uso | Obligatoria ahora |
| --- | --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL para migraciones y persistencia de ingesta | No, pero recomendada |
| `DATA_PROVIDER` | Adaptador activo; predeterminado y recomendado `free-public` | No |
| `API_FOOTBALL_API_KEY` | Clave privada del proveedor opcional API-Football | Solo para ese proveedor |
| `FOOTBALL_DATA_API_TOKEN` | Token alternativo de football-data.org | Solo para ese proveedor |
| `NEXT_PUBLIC_SITE_URL` | URL canónica usada en metadatos y sitemap | Recomendable al publicar |
| `NEXT_PUBLIC_ALLOW_INDEXING` | Permite robots y sitemap cuando vale `true` | No; debe permanecer `false` durante pruebas |

No se deben guardar claves reales en el repositorio.
