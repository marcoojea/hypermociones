# Checklist de publicación

## Verificación automática

Ejecutar desde la raíz del proyecto:

```powershell
npm.cmd run check:release
```

El mismo control se ejecuta en GitHub con cada subida y cada pull request.

## Prueba manual

1. Revisar portada, jugadores, equipos, partidos y estado de datos en escritorio y móvil.
2. Cargar la plantilla de prueba en Mi equipo, modificar una proyección, guardar y recargar.
3. Marcar un titular como lesionado y confirmar que el optimizador lo excluye.
4. Guardar una alineación, abrir el centro de alineaciones y comprobar que aparece.
5. Exportar una copia desde Datos locales, restaurarla y verificar que el estado reaparece.
6. Comprobar navegación por teclado, foco visible y reducción de movimiento.
7. Confirmar que `/api/health` devuelve `status: "ok"`.
8. Confirmar que `/robots.txt` bloquea el rastreo mientras `NEXT_PUBLIC_ALLOW_INDEXING=false`.

## Decisión de lanzamiento

- Confirmar condiciones de reutilización y atribución de las fuentes.
- Revisar jurídicamente privacidad y condiciones si habrá uso comercial.
- Activar el canal privado de vulnerabilidades del repositorio.
- Configurar `NEXT_PUBLIC_SITE_URL` con la URL definitiva.
- Cambiar `NEXT_PUBLIC_ALLOW_INDEXING=true` solamente en el despliegue aprobado.
- Publicar y repetir el smoke test contra la URL definitiva.

## Actualizar los datos sin usar PowerShell

En GitHub abre **Actions → Refresh official data → Run workflow**. El proceso gratuito descarga el snapshot, comprueba su calidad y solo crea un commit cuando hay cambios. Se mantiene manual hasta confirmar las condiciones de uso de la fuente; después podrá programarse.

## Marcha atrás

Si una comprobación crítica falla después de publicar, mantener la indexación desactivada y volver al último commit aprobado. Los datos personales de Mi equipo permanecen en el navegador y no necesitan migración del servidor.
