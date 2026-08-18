import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[SMOKE] Servicio / Salud, seguridad e indexación / protege el entorno de pruebas', async ({ page }, testInfo) => {
  const healthResponse = await page.goto('/api/health');
  const health = JSON.parse(await page.locator('body').innerText()) as { status?: string; service?: string };
  await page.goto('/robots.txt');
  const robots = await page.locator('body').innerText();
  const homeResponse = await page.goto('/');
  const securityHeaders = {
    contentTypeOptions: homeResponse?.headers()['x-content-type-options'],
    frameOptions: homeResponse?.headers()['x-frame-options'],
    referrerPolicy: homeResponse?.headers()['referrer-policy'],
    permissionsPolicy: homeResponse?.headers()['permissions-policy'],
  };
  const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
  const passed = healthResponse?.ok() === true
    && health.status === 'ok'
    && health.service === 'hypermociones'
    && robots.includes('Disallow: /')
    && robotsMeta?.includes('noindex') === true
    && securityHeaders.contentTypeOptions === 'nosniff'
    && securityHeaders.frameOptions === 'DENY'
    && securityHeaders.referrerPolicy === 'strict-origin-when-cross-origin'
    && securityHeaders.permissionsPolicy?.includes('camera=()') === true;
  await attachQaEvidence(page, testInfo, {
    title: 'Salud, protección HTTP y bloqueo de indexación',
    source: ['docs/release-checklist.md — Prueba manual, pasos 7 y 8', 'docs/launch-plan.md — Fase 1: base técnica y confianza', 'README.md — NEXT_PUBLIC_ALLOW_INDEXING debe permanecer false durante pruebas'],
    status: passed ? 'PASS' : 'FAIL',
    expected: {
      description: 'El servicio debe estar saludable y el entorno de pruebas debe aplicar noindex y cabeceras defensivas.',
    },
    actual: { healthStatusCode: healthResponse?.status(), health, robots, robotsMeta, securityHeaders, url: page.url() },
  });

  expect(healthResponse?.ok(), 'EXPECTED RESULT: el endpoint de salud debe responder correctamente').toBe(true);
  expect(health.status, 'EXPECTED RESULT: el estado de salud debe ser ok').toBe('ok');
  expect(health.service, 'EXPECTED RESULT: el endpoint debe identificar el servicio Hypermociones').toBe('hypermociones');
  expect(robots, 'EXPECTED RESULT: robots.txt debe bloquear el rastreo durante las pruebas').toContain('Disallow: /');
  expect(robotsMeta, 'EXPECTED RESULT: las páginas deben declarar noindex mientras la indexación no esté aprobada').toContain('noindex');
  expect(securityHeaders.contentTypeOptions, 'EXPECTED RESULT: las respuestas deben impedir el MIME sniffing').toBe('nosniff');
  expect(securityHeaders.frameOptions, 'EXPECTED RESULT: la aplicación no debe poder embeberse en marcos externos').toBe('DENY');
  expect(securityHeaders.referrerPolicy, 'EXPECTED RESULT: la aplicación debe limitar la información enviada como referrer').toBe('strict-origin-when-cross-origin');
  expect(securityHeaders.permissionsPolicy, 'EXPECTED RESULT: las capacidades sensibles no utilizadas deben permanecer deshabilitadas').toContain('camera=()');
});

