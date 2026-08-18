# Ruta de QA manual — 60 minutos

Objetivo: validar en una hora los recorridos con mayor riesgo antes de una candidata a lanzamiento. Ejecuta la ruta primero en escritorio con Chromium y repite los puntos marcados como responsive con una ventana móvil.

## Preparación — minutos 0 a 5

1. Ejecuta `npm.cmd run dev` y abre la URL que muestre la terminal.
2. Abre DevTools, activa **Preserve log** y limpia consola y red.
3. Usa un perfil de navegador limpio o borra los datos desde `/settings/data`.
4. Confirma que portada, `/robots.txt` y `/api/health` responden, sin errores de consola.

## Primera visita y navegación — minutos 5 a 12

1. Completa el onboarding con nombre, jornada, formación y presupuesto.
2. Elige crear una plantilla inicial y comprueba que aparece el centro personal.
3. Usa `Ctrl/⌘ + K`; busca un jugador, un equipo y la herramienta Mercado.
4. Desde el buscador añade un jugador a **Mi equipo** y a **Seguimiento**; verifica los avisos y los destinos.
5. Recorre navegación superior, enlaces del pie y navegación inferior móvil; no debe haber rutas 404 inesperadas.

## Núcleo Fantasy — minutos 12 a 27

1. En `/my-team`, revisa la plantilla inicial, cambia formación y completa una proyección y una probabilidad de titularidad.
2. Guarda, recarga y confirma persistencia. Realiza un cambio sin guardar e intenta cerrar/recargar: debe aparecer el aviso del navegador.
3. En `/availability`, registra una baja para un jugador de tu equipo, guarda y vuelve a Mi equipo; el estado debe reflejarse.
4. En `/lineups/editor`, cambia titulares, confianza y una nota; guarda y verifica el resultado en `/lineups`.
5. Abre `/gameweek` y comprueba que sus alertas coinciden con la disponibilidad y la plantilla guardadas.

En una ventana con partido real, reserva dos minutos de este bloque para `/live`: verifica minuto, marcador, eventos, actualización automática y que las métricas ausentes aparecen como `—`, nunca como cero.

## Decisión, mercado y planificación — minutos 27 a 38

1. En `/tiers`, cambia posición, equipo y orden; abre al menos una explicación.
2. Añade y quita una estrella y comprueba `/watchlist`.
3. En `/compare`, selecciona entre dos y cuatro jugadores, abre sus explicaciones y retira uno.
4. En `/market`, busca un jugador, intenta guardar campos vacíos y confirma el error; después guarda precio y variación válidos, exporta e importa el borrador.
5. En `/planner`, crea un escenario de venta/fichaje, compártelo y elimínalo.

## Datos, cuenta y recuperación — minutos 38 a 49

1. En `/settings/data`, exporta una copia JSON y conserva el archivo.
2. Modifica o elimina algún dato local; restaura el JSON y comprueba que reaparece.
3. En el despliegue alojado, abre `/account`, accede con ChatGPT y confirma que el correo y nombre son correctos.
4. Cambia nombre, vista compacta y movimiento reducido; guarda y confirma el efecto visual.
5. Pulsa **Sincronizar este dispositivo**. En otro perfil/dispositivo con la misma cuenta, usa **Restaurar aquí** y confirma el estado.
6. Cierra sesión y verifica que el modo invitado sigue operativo. Deja la eliminación de cuenta para una cuenta de prueba desechable.

## Responsive, accesibilidad y resiliencia — minutos 49 a 57

1. Repite portada, buscador, Mi equipo, comparador y Mercado a 390 × 844 px; no debe existir contenido esencial inaccesible.
2. Navega solo con teclado: salto al contenido, `Ctrl/⌘ + K`, cierre con Escape, foco visible y orden lógico.
3. Activa reducción de movimiento del sistema y de la cuenta; no deben permanecer animaciones esenciales.
4. En una compilación de producción, instala la PWA si el navegador lo permite; activa modo offline y confirma que aparece la pantalla de conexión sin un error genérico.

## Cierre — minutos 57 a 60

1. Revisa consola, peticiones 4xx/5xx, textos cortados y avisos que no desaparecen.
2. Registra cada incidencia con URL, navegador, ancho, datos previos, pasos, esperado justificable, observado y captura.
3. Clasifica como **bloqueante**, **alta**, **media**, **baja** o **NEEDS CLARIFICATION**.
4. No apruebes lanzamiento si falla autenticación, persistencia, restauración, navegación principal, privacidad/eliminación, datos frescos o una acción crítica de plantilla.

## Batería Playwright separada

No forma parte del cronómetro manual. Ejecútala cuando termines:

```powershell
npm.cmd run qa:e2e
```

Informe HTML:

```powershell
npm.cmd run qa:e2e:report
```
