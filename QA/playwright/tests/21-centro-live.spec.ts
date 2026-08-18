import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[LIVE] Visitante / Centro live / informa cobertura sin inventar métricas', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const response = await page.goto('/live', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Centro live' }), 'CHECKPOINT: debe mostrarse el centro live').toBeVisible();
  await expect(page.locator('.live-loading'), 'CHECKPOINT: la consulta inicial debe terminar').toHaveCount(0, { timeout: 30_000 });

  const apiResponse = await page.request.get('/api/live');
  const payload = await apiResponse.json() as { status?: string; provider?: string; capabilities?: { fantasyPoints?: boolean }; message?: string; matches?: unknown[] };
  const validStatus = ['LIVE', 'RECENT', 'IDLE', 'UNAVAILABLE'].includes(payload.status ?? '');
  const passed = response?.ok() === true && apiResponse.ok() && validStatus && payload.capabilities?.fantasyPoints === false && Array.isArray(payload.matches);

  await attachQaEvidence(page, testInfo, {
    title: 'Centro live y degradación explícita',
    source: ['docs/architecture.md — Centro live', 'docs/data-sources.md — cobertura efectiva actual', 'README.md — ruta /live'],
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'El centro live debe cargar, declarar su cobertura real y no presentar rating o ausencia de datos como puntos Fantasy.' },
    actual: { pageStatus: response?.status(), apiStatus: apiResponse.status(), feedStatus: payload.status, provider: payload.provider, capabilities: payload.capabilities, message: payload.message, matches: payload.matches?.length },
  });

  expect(response?.ok(), 'EXPECTED RESULT: /live debe responder correctamente').toBe(true);
  expect(apiResponse.ok(), 'EXPECTED RESULT: /api/live debe responder con un contrato utilizable incluso sin cobertura').toBe(true);
  expect(validStatus, 'EXPECTED RESULT: el feed debe usar un estado live documentado').toBe(true);
  expect(payload.capabilities?.fantasyPoints, 'EXPECTED RESULT: no deben afirmarse puntos Fantasy sin reglas aprobadas').toBe(false);
  expect(Array.isArray(payload.matches), 'EXPECTED RESULT: el feed siempre debe incluir una colección de partidos').toBe(true);
});
