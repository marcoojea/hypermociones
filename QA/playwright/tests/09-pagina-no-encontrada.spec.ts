import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[UX] Visitante / Página no encontrada / ofrece rutas de recuperación genéricas', async ({ page }, testInfo) => {
  const response = await page.goto('/ruta-qa-que-no-existe');
  const headingVisible = await page.getByRole('heading', { name: 'Esta página no está disponible' }).isVisible();
  const recoveryLinks = await Promise.all(['Volver al inicio', 'Explorar jugadores', 'Ver equipos'].map(async (name) => ({
    name,
    visible: await page.getByRole('link', { name }).isVisible(),
  })));
  const passed = response?.status() === 404 && headingVisible && recoveryLinks.every((link) => link.visible);

  await attachQaEvidence(page, testInfo, {
    title: 'Recuperación desde una ruta inexistente',
    source: 'Solicitud de preparación para lanzamiento — recuperación general ante navegación rota',
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'Una URL inexistente debe devolver 404 y ofrecer opciones generales para continuar navegando.' },
    actual: { statusCode: response?.status(), headingVisible, recoveryLinks, url: page.url() },
  });

  expect(response?.status(), 'EXPECTED RESULT: una ruta inexistente debe responder con estado 404').toBe(404);
  expect(headingVisible, 'EXPECTED RESULT: la página debe explicar que la URL no está disponible').toBe(true);
  expect(recoveryLinks.every((link) => link.visible), 'EXPECTED RESULT: deben existir rutas de recuperación útiles').toBe(true);
});

