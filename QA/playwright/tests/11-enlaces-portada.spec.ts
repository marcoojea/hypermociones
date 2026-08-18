import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

const interactionSource = [
  'README.md — Estado actual y prueba manual antes de publicar',
  'docs/release-checklist.md — Prueba manual',
  'Solicitud de ampliación QA — probar botones y elementos clicables',
];

test('[INTERACCIONES] Visitante / Navegación interna / abre todos los enlaces visibles de la portada', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(15_000);

  await page.goto('/', { waitUntil: 'networkidle' });
  const hrefs = await page.locator('header a[href^="/"], main a[href^="/"], footer a[href^="/"]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href && !href.startsWith('/#'))))],
  );
  const results: Array<{ href: string; destination: string | null; error: string | null }> = [];

  for (const href of hrefs) {
    try {
      await page.goto('/', { waitUntil: 'networkidle' });
      const link = page.locator(`a[href=${JSON.stringify(href)}]:visible`).first();
      await link.click();
      await expect(page, `CHECKPOINT: el enlace ${href} debe completar su navegación`).toHaveURL((url) => url.pathname === new URL(href, url).pathname);
      await page.getByRole('main').waitFor({ state: 'visible' });
      const destination = new URL(page.url());
      results.push({ href, destination: `${destination.pathname}${destination.search}`, error: null });
    } catch (error) {
      results.push({ href, destination: null, error: error instanceof Error ? error.message : String(error) });
    }
  }

  await page.goto('/', { waitUntil: 'networkidle' });

  const failures = results.filter((result) => result.error || !result.destination || new URL(result.href, 'http://qa.local').pathname !== new URL(result.destination, 'http://qa.local').pathname);
  await attachQaEvidence(page, testInfo, {
    title: 'Enlaces internos visibles de la portada',
    source: interactionSource,
    status: failures.length ? 'FAIL' : 'PASS',
    expected: { description: 'Cada enlace interno visible debe responder al click y abrir su ruta declarada.' },
    actual: { testedLinks: results.length, results, failures },
    technicalError: failures.map((failure) => failure.error).filter(Boolean).join('\n') || null,
  });

  expect(hrefs.length, 'EXPECTED RESULT: la portada debe ofrecer navegación interna').toBeGreaterThan(0);
  expect(failures, 'EXPECTED RESULT: los enlaces internos visibles no deben estar rotos').toEqual([]);
});
