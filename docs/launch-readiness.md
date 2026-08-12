# Preparación para lanzamiento

## Ya operativo

- Catálogo real 2026/27 de equipos, jugadores y dos primeras jornadas.
- Páginas indexables de jugadores y equipos.
- Editor de alineaciones probables por club y jornada.
- Centro editorial de disponibilidad con fuente e importación/exportación.
- Mi equipo local con reglas configurables y optimizador explicable.
- Navegación adaptable a móvil.
- Validación de tipos, lint, build y pruebas de dominio.
- Despliegue privado reproducible y repositorio GitHub sincronizado hasta la última versión aprobada.

## Necesario antes de lanzamiento público

1. Validar manualmente en escritorio y móvil los flujos críticos.
2. Confirmar por escrito las condiciones de reutilización y atribución de cada fuente.
3. Decidir si el producto seguirá siendo privado/local o necesita cuentas y persistencia PostgreSQL.
4. Conseguir un proveedor autorizado de estadísticas avanzadas y Fantasy si se quieren FIS y puntos esperados automáticos.
5. Añadir monitorización de errores, analítica respetuosa con privacidad y política legal/privacidad.
6. Incorporar pruebas end-to-end cuando el comportamiento del producto quede estabilizado.

## Criterio de honestidad analítica

Ningún campo ausente se transforma en cero. El optimizador no etiqueta como predicción una entrada manual ni suma proyecciones parciales. Los partes editoriales conservan fuente y nivel de confirmación.
