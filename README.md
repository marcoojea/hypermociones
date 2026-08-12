# Hypermociones

Plataforma de analytics Fantasy para LaLiga Hypermotion. Incluye jugadores y equipos reales 2026/27, calendario, fichas de club y un editor completo de alineaciones probables.

## Estado actual

- Dashboard de entrada orientado a jugadores y jornada.
- `/players`: búsqueda por nombre/equipo, filtros por equipo, posición y estado, y ordenación por métricas.
- `/player/{slug}`: perfil, estadísticas agregadas, tendencia reciente, señales positivas y riesgos.
- `/teams` y `/team/{slug}`: directorio de los 22 clubes, plantilla oficial, disponibilidad y próximo partido.
- `/lineups`: centro de alineaciones por jornada con once probable, banquillo y notas cuando existe una edición guardada.
- `/lineups/editor`: editor táctico con cinco formaciones, confianza por jugador, roles a balón parado, banquillo, notas e importación/exportación JSON.
- `/fixtures`: calendario y resultados reales cuando existe una importación.
- Dominio, repositorios e interfaces de proveedores separados de React.
- Esquema relacional PostgreSQL preparado para histórico, ingesta, features, predicciones y backtesting.
- Validación Zod de estadísticas entrantes y pruebas del dominio.

El editor guarda cada equipo y jornada en el navegador: es gratis, no requiere cuenta ni servidor y permite exportar un JSON como copia de seguridad. Los datos que la fuente no publica se muestran como no disponibles; la aplicación no inventa métricas ni probabilidades.

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

Los proveedores opcionales pueden ampliar minutos, apariciones, titularidades, goles, asistencias, tiros y pases clave. xG/xA y los datos propios de LALIGA Fantasy permanecen ausentes hasta incorporar una fuente autorizada que los cubra.

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
| `DATA_PROVIDER` | Adaptador activo; predeterminado y recomendado `free-public` | No |
| `API_FOOTBALL_API_KEY` | Clave privada del proveedor opcional API-Football | Solo para ese proveedor |
| `FOOTBALL_DATA_API_TOKEN` | Token alternativo de football-data.org | Solo para ese proveedor |

No se deben guardar claves reales en el repositorio.
