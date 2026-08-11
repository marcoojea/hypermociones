# Hypermociones

Plataforma de analytics Fantasy para LaLiga Hypermotion. Incluye el vertical slice de **Players**, calendario de **Fixtures** e ingesta real 2026/27 mediante un proveedor autorizado.

## Estado actual

- Dashboard de entrada orientado a jugadores.
- `/players`: búsqueda por nombre/equipo, filtros por equipo, posición y estado, y ordenación por métricas.
- `/player/{slug}`: perfil, estadísticas agregadas, tendencia reciente, señales positivas y riesgos.
- `/fixtures`: calendario y resultados reales cuando existe una importación.
- Dominio, repositorios e interfaces de proveedores separados de React.
- Esquema relacional PostgreSQL preparado para histórico, ingesta, features, predicciones y backtesting.
- Validación Zod de estadísticas entrantes y pruebas del dominio.

Sin credenciales, Players funciona en modo demostración y Fixtures no inventa partidos. Tras ejecutar la ingesta, ambas secciones cambian automáticamente al snapshot real y muestran su procedencia.

## Desarrollo

Requisitos: Node.js 22.13 o superior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en la URL local indicada por el servidor.

## Cargar LaLiga Hypermotion 2026/27 gratis

El proveedor predeterminado lee el calendario y las plantillas mostradas actualmente en las fichas oficiales de la RFEF. No necesita registro ni clave privada. Ejecuta:

```bash
npm run data:fetch
```

El comando obtiene los 22 equipos, las plantillas actuales y las métricas que la ficha RFEF publica (edad, nacionalidad, dorsal, goles y tarjetas), valida las respuestas y actualiza `data/generated/real-data.json`. Minutos, titularidades, asistencias y xG permanecen vacíos mientras la fuente no los publique. Si existe `DATABASE_URL`, también hace upsert en PostgreSQL.

API-Football devuelve minutos, apariciones, titularidades, goles, asistencias, tiros y pases clave mediante páginas de estadísticas de temporada. xG/xA y los datos propios de LALIGA Fantasy permanecen ausentes hasta incorporar una fuente autorizada que los cubra.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Base de datos

El modelo usa PostgreSQL y Drizzle. Copia `.env.example` a `.env` cuando exista una instancia local. La ingesta persiste el snapshot mediante upserts idempotentes; la aplicación usa una proyección JSON generada para mantener el runtime web desacoplado de la conexión.

```bash
npm run db:generate
npm run db:migrate
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
db/              esquema PostgreSQL
docs/            arquitectura y evaluación de fuentes
tests/           pruebas de dominio y normalización
```

Más detalle en [docs/architecture.md](docs/architecture.md) y [docs/data-sources.md](docs/data-sources.md).

## Variables de entorno

| Variable | Uso | Obligatoria ahora |
| --- | --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL para migraciones y persistencia de ingesta | No, pero recomendada |
| `DATA_PROVIDER` | Adaptador activo; recomendado `api-football` | Sí |
| `API_FOOTBALL_API_KEY` | Clave privada de API-Football | Sí, para el proveedor recomendado |
| `FOOTBALL_DATA_API_TOKEN` | Token alternativo de football-data.org | Solo para ese proveedor |

No se deben guardar claves reales en el repositorio.
