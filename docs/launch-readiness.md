# Preparación para lanzamiento

## Ya operativo

- Catálogo real 2026/27 de equipos, jugadores y dos primeras jornadas.
- Páginas indexables de jugadores y equipos.
- Editor de alineaciones probables por club y jornada.
- Centro editorial de disponibilidad con fuente e importación/exportación.
- Mi equipo local con reglas configurables y optimizador explicable.
- Copia integral, restauración y borrado explícito de los datos guardados en el navegador.
- Privacidad, términos, atribución, estados de error y controles de indexación previos al lanzamiento.
- Metadatos sociales, datos estructurados, sitemap, manifest y cabeceras defensivas.
- Estado público de cobertura y frescura, endpoint de salud y control automático en GitHub.
- Centro de jornada, Tier por posición, rankings, comparación, seguimiento, planificación y mercado aportado.
- Historial local de revisiones editoriales para futuros controles de acierto.
- Renovaciones semanales agrupadas mediante Dependabot.
- Navegación adaptable a móvil.
- Validación de tipos, lint, build y pruebas de dominio.
- Despliegue privado reproducible y repositorio GitHub sincronizado hasta la última versión aprobada.

## Necesario antes de lanzamiento público

1. Validar manualmente en escritorio y móvil los flujos críticos.
2. Confirmar por escrito las condiciones de reutilización y atribución de cada fuente.
3. Revisar jurídicamente los borradores de privacidad y términos antes de un uso comercial.
4. Decidir si el producto seguirá siendo local o necesita cuentas y persistencia PostgreSQL.
5. Conseguir un proveedor autorizado de estadísticas avanzadas y Fantasy si se quieren FIS y puntos esperados automáticos.
6. Activar el canal privado de vulnerabilidades y elegir monitorización de errores.
7. Añadir analítica respetuosa con privacidad solo si aporta decisiones concretas.
8. Activar `NEXT_PUBLIC_ALLOW_INDEXING=true` únicamente en el despliegue público definitivo.

## Criterio de honestidad analítica

Ningún campo ausente se transforma en cero. El optimizador no etiqueta como predicción una entrada manual ni suma proyecciones parciales. Los partes editoriales conservan fuente y nivel de confirmación.
