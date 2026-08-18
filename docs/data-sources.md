# Fuentes de datos

Evaluación inicial realizada el 11 de agosto de 2026 y comprobación live repetida el 18 de agosto de 2026. La cobertura, licencia y precio deben volver a verificarse antes de contratar o activar un adaptador en producción.

| Fuente | Datos potenciales | Acceso | Decisión inicial |
| --- | --- | --- | --- |
| [football-data.org](https://docs.football-data.org/general/v4/lookup_tables.html) | Competición, equipos, plantillas, partidos, clasificación y agregados básicos por jugador | API REST con token y planes sujetos a condiciones | Adaptador disponible como alternativa. Segunda División figura como `TIER_TWO`, fuera del plan gratuito actual. |
| [Sportmonks La Liga 2](https://www.sportmonks.com/football-api/la-liga-2-api/) | Partidos, plantillas y estadísticas; la página declara cobertura específica de La Liga 2 | API comercial | Candidato para evaluación controlada de player stats. Validar campos xG/xA, histórico, SLA, redistribución y coste mediante prueba contractual. |
| Fichas públicas de competición RFEF | Equipos, plantillas, datos biográficos, calendario y estadísticas básicas publicadas | Acceso público sin credenciales; sujeto a revisión periódica de condiciones | **Fuente gratuita activa para el catálogo 2026/27.** Lectura respetuosa, trazabilidad y sin eludir controles. |
| [Transfermarkt open dataset](https://github.com/dcaribou/transfermarkt-datasets) | Perfiles, apariciones y valores históricos de mercado | Snapshot abierto CC0, actualizado semanalmente por su proyecto mantenedor | **Fuente gratuita activa para contexto de mercado.** Se conserva la fecha individual del valor y no se presenta como precio Fantasy. |
| [API-Football](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide) | Marcador y eventos cada 15 s; estadísticas de equipo/jugador aproximadamente cada minuto según cobertura | API comercial/freemium | Adaptador live implementado con caché central. El 18/08/2026 la clave configurada respondió que el plan gratuito solo permitía temporadas 2022–2024; requiere ampliar plan y confirmar flags de Segunda 2026/27. |
| [OpenLigaDB](https://beta.openligadb.de/) | Resultados y calendarios aportados por la comunidad | API abierta, datos declarados ODbL | Solo si la competición/temporada concreta tiene cobertura. Conservar atribución y revisar obligaciones ODbL. |
| [LALIGA web](https://www.laliga.com/informacion-legal/legal-web) | Contenido oficial visible públicamente | Web, sin API pública identificada para este proyecto | No usar como fuente de scraping. Sus términos limitan el contenido a uso personal/no comercial y prohíben reproducción comercial sin autorización. Solicitar licencia o API oficial si se desea usar. |
| LALIGA Fantasy | Precio, puntos, propiedad y mercado | Sin integración autorizada confirmada | No automatizar acceso ni eludir autenticación/anti-bot. Mantener `FantasyDataProvider` y permitir CSV/manual/proveedor autorizado. |
| Medios y clubes | Lesiones, convocatorias y declaraciones | RSS/API/licencia por fuente | Integrar únicamente fuentes con permiso; guardar URL, fecha y texto/procedencia. La clasificación estructurada nunca sustituye a la fuente original. |

## Criterios de aceptación de proveedor

1. Permiso explícito para el uso y la redistribución prevista.
2. Cobertura comprobada de LaLiga Hypermotion en la temporada objetivo.
3. Identificadores estables y suficiente histórico.
4. Completitud medida por campo y jornada, no solo por una lista comercial de cobertura.
5. Límites, latencia, coste, atribución y política de retención documentados.
6. Exportación y estrategia de sustitución para evitar lock-in.

## Política de ingesta

Cada adaptador devuelve DTOs del proveedor; la normalización valida antes de persistir. Una importación crea `data_import_runs`, usa upsert por identificadores externos, registra errores por registro y solo avanza el cursor cuando el lote es recuperable. Los payloads dudosos se aíslan y nunca se transforman silenciosamente en ceros.

## Cobertura efectiva actual

| Campo | Estado |
| --- | --- |
| Equipos, nombres de jugadores, posición, nacionalidad y datos biográficos | Disponible en el snapshot RFEF |
| Calendario, jornada, fecha, estado y resultado | Disponible |
| Apariciones, titularidades, minutos, goles, asistencias, tiros y pases clave | Disponible cuando la cobertura `players` de API-Football está activa |
| xG, xA | No disponible en el primer adaptador |
| Lesiones | El flag del proveedor se conserva; debe cruzarse con una fuente específica antes de mostrar confianza alta |
| Precio y puntos LALIGA Fantasy | No disponible sin integración autorizada |
| Rendimiento 2025/26 | Disponible para 529 jugadores actuales mediante ficha pública: PJ, suplencias, minutos, goles, asistencias y tarjetas |
| Valor de mercado | Disponible cuando el jugador se enlaza al dataset abierto; siempre con fecha y sin confundirlo con precio Fantasy |
| FIS y expected points | No se calculan hasta disponer de histórico suficiente |
| Marcador, minuto y eventos live | Adaptador preparado; bloqueado hasta disponer de un plan con temporada 2026/27 |
| Estadística de equipo/jugador live | Adaptador preparado; depende de los flags reales de cobertura por competición y partido |
| Puntos Fantasy live | **NEEDS CLARIFICATION:** falta elegir plataforma/reglamento y obtener una fuente autorizada de sus puntuaciones |

Las fuentes, condiciones y cobertura deben revisarse antes de un lanzamiento comercial. La aplicación mantiene ausentes las métricas no publicadas y permite introducir información Fantasy manualmente o mediante un futuro proveedor autorizado.

El centro live incluye un respaldo puntual de los 11 marcadores y sus estadísticas de equipo (posesión, remates, efectividad, faltas, fueras de juego, córners y tarjetas) de la jornada 1, verificados manualmente el 18/08/2026 contra las fichas oficiales de LALIGA. No se completan tiros a puerta, paradas, eventos ni métricas individuales cuando la fuente consultada no los publica. Sirve para evitar una pantalla vacía cuando falla la fuente contratada, pero no constituye scraping automático, cobertura en directo ni autorización para reutilizar la base de datos de LALIGA. Debe reemplazarse por un proveedor licenciado.
