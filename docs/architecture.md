# Arquitectura

## Decisión

Se adopta un **monolito modular**. La UI y las rutas viven en la aplicación web, mientras que dominio, repositorios, proveedores e ingesta son módulos independientes. No se introducen microservicios ni un pipeline Python hasta que la complejidad analítica y el volumen lo justifiquen.

## Flujo de datos objetivo

```text
Proveedor -> adaptador -> validación/normalización -> staging/import run
          -> PostgreSQL -> features versionadas -> analytics/predicción
          -> repositorio de lectura -> Server Components/API -> interfaz
```

El flujo live es independiente del snapshot editorial:

```text
Proveedor live -> validación Zod -> captura compartida D1 (TTL 30–300 s)
               -> /api/live -> polling visible del navegador -> /live
```

La caché central evita que cada visitante consuma cuota del proveedor. Si la fuente falla, la API devuelve la última captura marcada como obsoleta; si nunca hubo una captura válida, muestra cobertura no disponible y no fabrica resultados.

Mientras no exista una primera captura contratada, `/api/live` puede devolver un conjunto de resultados y estadísticas de equipo consolidados y verificados manualmente, siempre marcado como obsoleto y con enlace de procedencia. Los eventos, tiros a puerta, paradas y datos individuales permanecen ausentes si no existe una fuente suficiente. Este respaldo evita una pantalla vacía, pero no se presenta como live ni sustituye la integración autorizada.

## Límites de módulos

- `domain`: tipos y reglas puras. No importa React, base de datos ni proveedores.
- `providers`: puertos externos (`FootballDataProvider`, `FantasyDataProvider`, `NewsProvider`) y normalizadores.
- `repositories`: contrato de lectura que evita acoplar rutas y componentes a Drizzle o al seed.
- `db`: modelo relacional e histórico. No abre conexiones al importarse.
- `app` y `components`: composición y presentación; no contienen fórmulas de negocio.

## Persistencia e histórico

PostgreSQL es el destino por su integridad relacional, consultas analíticas y ecosistema. Los datos que cambian no se sobrescriben:

- `player_teams` representa transferencias y pertenencia temporal por temporada.
- `fantasy_player_snapshots` y `player_price_history` conservan el mercado en el tiempo.
- `player_statuses`, `injuries` y `suspensions` conservan validez y procedencia.
- `player_feature_snapshots`, `player_predictions` y `recommendations` guardan versión y momento de cálculo.
- `lineups` y `lineup_players` conservan esperado y real para backtesting.
- `data_import_runs` registra contadores, cursor y errores para reanudar procesos.

Las claves únicas `provider + externalId` permiten upserts idempotentes. Las restricciones de calidad adicionales (equipos distintos en fixture, valores no negativos y ventanas temporales coherentes) se aplicarán en migraciones SQL y en la capa de normalización.

## Vertical slice Players

El repositorio compuesto usa el snapshot real cuando contiene una importación válida y recurre al seed únicamente en modo demostración. Las rutas `/players` y `/player/{slug}` no conocen la implementación concreta. Los filtros y ordenación se expresan en la URL y se ejecutan en servidor; esto facilita SSR, enlaces compartibles y una transición directa a consultas SQL paginadas.

## Mi equipo y optimizador

La primera versión usa almacenamiento del navegador porque la plantilla es estado privado y local del usuario. `domain/fantasy-team.ts` contiene reglas, validación, puntuación y optimización sin importar React. La UI permite sustituir esta persistencia por `fantasy_teams`, `fantasy_squad_players`, `lineups` y `lineup_players` cuando se introduzca autenticación.

El motor solo suma puntos esperados cuando los once titulares tienen una proyección manual explícita. En otro caso ordena mediante las señales realmente disponibles, penaliza dudas, excluye lesiones y sanciones y devuelve avisos de falta de datos. Las reglas —formaciones, banquillo, capitán y máximo por club— se reciben como configuración y no están acopladas a un juego concreto.

## Ingesta real 2026/27

`ApiFootballProvider` y `FootballDataOrgProvider` implementan el contrato común y limitan las peticiones según configuración. `data:fetch` selecciona el adaptador mediante `DATA_PROVIDER`, valida el feed con Zod, genera un snapshot de lectura para el runtime web y persiste el mismo conjunto normalizado en PostgreSQL cuando existe `DATABASE_URL`.

La persistencia usa upserts por `provider + externalId`, una transacción por snapshot y `data_import_runs` para estado y contadores. `player_season_stats` almacena únicamente agregados entregados por el proveedor. Valores ausentes se guardan como `NULL`; nunca se convierten a cero.

El snapshot JSON es una proyección de lectura local, no la fuente canónica de largo plazo. Permite que el runtime web funcione sin abrir conexiones PostgreSQL desde componentes y se regenera tras cada importación. El siguiente paso será servir estas proyecciones desde una API/repositorio PostgreSQL desplegable.

## Centro live

`ApiFootballLiveProvider` normaliza estados, marcador, minuto, eventos, estadísticas de equipo y rendimiento individual. `/api/live` consulta primero `live_feed_cache` en D1 y solo solicita una captura nueva cuando expira. La interfaz reduce el polling a cinco minutos fuera de ventanas en juego y detiene consultas cuando la pestaña no está visible.

La captura live no sustituye el histórico analítico PostgreSQL: cuando exista infraestructura de ingesta permanente, cada cierre de partido debe consolidarse en `fixtures`, `matches`, `team_match_stats` y `player_match_stats`. D1 sirve únicamente como proyección de baja latencia y caché compartida.

## Decisiones diferidas

- FIS: el valor seed solo demuestra la presentación en modo demo. Con datos reales permanece ausente hasta definir, versionar y calibrar la fórmula.
- Expected points automático: no se calcula sin histórico y backtesting. El usuario puede introducir proyecciones manuales, claramente identificadas.
- Puntuación Fantasy live: necesita plataforma y reglamento versionado; el rating del proveedor no se presenta como puntos Fantasy.
- Servicio Python: se introduce únicamente cuando feature engineering/backtesting exceda el monolito.
- Ingesta histórica live: falta desplegar PostgreSQL/cola o un almacén analítico antes de conservar cada cambio minuto a minuto.
