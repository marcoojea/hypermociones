# Arquitectura

## Decisión

Se adopta un **monolito modular**. La UI y las rutas viven en la aplicación web, mientras que dominio, repositorios, proveedores e ingesta son módulos independientes. No se introducen microservicios ni un pipeline Python hasta que la complejidad analítica y el volumen lo justifiquen.

## Flujo de datos objetivo

```text
Proveedor -> adaptador -> validación/normalización -> staging/import run
          -> PostgreSQL -> features versionadas -> analytics/predicción
          -> repositorio de lectura -> Server Components/API -> interfaz
```

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

## Decisiones diferidas

- FIS: el valor seed solo demuestra la presentación en modo demo. Con datos reales permanece ausente hasta definir, versionar y calibrar la fórmula.
- Expected points automático: no se calcula sin histórico y backtesting. El usuario puede introducir proyecciones manuales, claramente identificadas.
- Autenticación: no es necesaria hasta persistir plantillas de usuarios.
- Servicio Python: se introduce únicamente cuando feature engineering/backtesting exceda el monolito.
- Caché, colas y rate limiting: se seleccionarán con el primer proveedor real y sus límites contractuales.
