# Plan de lanzamiento de Hypermociones

Este plan separa trabajo técnico ejecutable de decisiones que requieren validación de negocio, jurídica o de proveedores.

## Fase 1 — Base técnica y confianza

Estado: en curso.

- [x] Smoke y flujos críticos automatizados en Chromium.
- [x] Evidencias Expected/Actual y screenshots en PASS y FAIL.
- [x] Visor del reporte QA con puerto local disponible automáticamente.
- [x] Meta `noindex` coherente con `NEXT_PUBLIC_ALLOW_INDEXING=false`.
- [x] Cabeceras defensivas básicas sin introducir una CSP incompatible.
- [x] Acceso visible a privacidad, condiciones, metodología y contacto.
- [x] Onboarding de portada y explicación del almacenamiento local.
- [x] Suite de interacción montada para navegación, botones, formularios, detalles, descargas e importaciones.
- [ ] Ejecutar manualmente QA en Chromium después de cada lote.
- [ ] Ejecutar la matriz Firefox/WebKit antes de la release candidate.
- [ ] Verificar cabeceras en el despliegue real, porque el proveedor puede añadir o reemplazar valores.

## Fase 2 — Cierre funcional

- Automatizar y validar disponibilidad → exclusión del optimizador.
- Cubrir filtros y ordenación de jugadores y Tiers.
- Cubrir comparador, planificador y mercado con datos locales independientes.
- Añadir casos negativos de importación JSON y límites de formularios cuando sus Expected Results estén aprobados.
- Revisar navegación por teclado, foco, lectores de pantalla y reducción de movimiento.
- Validar restauración de copias creadas por la versión anterior antes de cambiar esquemas de almacenamiento.

## Fase 3 — Decisiones de negocio bloqueantes

- Confirmar si la primera versión seguirá siendo local o incorporará cuentas y sincronización.
- Definir propuesta comercial, precio y canal de soporte si habrá monetización.
- Aprobar por escrito las condiciones de reutilización y atribución de cada fuente.
- Obtener revisión jurídica de privacidad, condiciones y uso de marcas antes del lanzamiento comercial.
- Elegir monitorización de errores con una política de datos compatible con privacidad.
- Decidir si se necesita analítica; definir previamente preguntas, eventos y retención.
- Contratar un proveedor autorizado antes de presentar métricas Fantasy avanzadas como automáticas.

## Fase 4 — Release candidate

1. Congelar alcance y actualizar snapshots de datos.
2. Ejecutar `npm.cmd run check:release`.
3. Ejecutar Playwright en Chromium, Firefox y WebKit.
4. Revisar manualmente escritorio, móvil, teclado y recuperación de errores.
5. Configurar `NEXT_PUBLIC_SITE_URL` con el dominio definitivo.
6. Mantener `NEXT_PUBLIC_ALLOW_INDEXING=false` durante la validación privada.
7. Desplegar la release candidate y repetir health, robots, sitemap y smoke contra la URL real.
8. Activar indexación únicamente después de la aprobación funcional, jurídica y de fuentes.

## Criterio de salida al mercado

No se considera lista para lanzamiento comercial mientras queden pendientes la aprobación de fuentes y la revisión jurídica. Técnicamente, la release candidate debe tener datos vigentes, health `ok`, matriz QA aprobada, backup/restauración verificados, navegación accesible y rollback documentado.
