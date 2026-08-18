import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test.use({ viewport: { width: 390, height: 844 } });

test('[RESPONSIVE] Visitante / Navegación móvil / accede a Mi equipo sin desbordamiento', async ({ page }, testInfo) => {
    await page.goto('/');
    const mobileNavigation = page.getByRole('navigation', { name: 'Navegación móvil' });
    const navigationVisible = await mobileNavigation.isVisible();
    const initialOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await mobileNavigation.getByRole('link', { name: 'Mi equipo' }).click();
    await expect(page, 'CHECKPOINT: debe completarse la navegación móvil a Mi equipo').toHaveURL('/my-team');
    const destinationHeading = page.getByRole('heading', { name: 'Mi equipo', level: 1 });
    await expect(destinationHeading, 'CHECKPOINT: Mi equipo debe terminar de cargar en móvil').toBeVisible();
    const headingVisible = await destinationHeading.isVisible();
    const destinationOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const passed = navigationVisible && headingVisible && initialOverflow <= 0 && destinationOverflow <= 0;
    await attachQaEvidence(page, testInfo, {
      title: 'Navegación móvil y ajuste al viewport',
      source: ['README.md — Prueba manual antes de publicar, paso 8', 'docs/launch-readiness.md — Navegación adaptable a móvil'],
      status: passed ? 'PASS' : 'FAIL',
      expected: {
        description: 'En ventana estrecha debe mostrarse la navegación móvil, permitir acceder a Mi equipo y evitar desbordamiento horizontal.',
      },
      actual: { navigationVisible, headingVisible, initialOverflow, destinationOverflow, viewport: page.viewportSize(), url: page.url() },
    });

    expect(navigationVisible, 'EXPECTED RESULT: la navegación móvil debe estar disponible en ventana estrecha').toBe(true);
    expect(headingVisible, 'EXPECTED RESULT: la navegación móvil debe permitir acceder a Mi equipo').toBe(true);
    expect(initialOverflow, 'EXPECTED RESULT: la portada no debe desbordar horizontalmente el viewport móvil').toBeLessThanOrEqual(0);
    expect(destinationOverflow, 'EXPECTED RESULT: Mi equipo no debe desbordar horizontalmente el viewport móvil').toBeLessThanOrEqual(0);
  });

