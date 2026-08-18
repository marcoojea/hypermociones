import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[E2E] Usuario local / Mi equipo / guarda y conserva la plantilla tras recargar', async ({ page }, testInfo) => {
  const savedName = `Plantilla QA ${Date.now()}`;
  await page.goto('/my-team');
  await page.getByRole('button', { name: 'Cargar plantilla de prueba' }).click();

  const squadRows = page.locator('.squad-editor-row');
  const loadedPlayers = await squadRows.count();
  await page.getByLabel('Nombre').fill(savedName);
  await page.getByRole('button', { name: 'Guardar equipo' }).click();
  await page.reload();

  const persistedName = await page.getByLabel('Nombre').inputValue();
  const persistedPlayers = await squadRows.count();
  const passed = loadedPlayers > 0 && persistedName === savedName && persistedPlayers === loadedPlayers;
  await attachQaEvidence(page, testInfo, {
    title: 'Persistencia local de Mi equipo',
    source: ['README.md — Prueba manual antes de publicar, pasos 1 y 5', 'docs/release-checklist.md — Prueba manual, paso 2'],
    status: passed ? 'PASS' : 'FAIL',
    expected: {
      description: 'La plantilla de prueba guardada debe permanecer después de recargar la página.',
    },
    actual: { savedName, persistedName, loadedPlayers, persistedPlayers, url: page.url() },
  });

  expect(loadedPlayers, 'EXPECTED RESULT: la acción debe cargar jugadores en la plantilla').toBeGreaterThan(0);
  expect(persistedName, 'EXPECTED RESULT: el nombre guardado debe conservarse tras recargar').toBe(savedName);
  expect(persistedPlayers, 'EXPECTED RESULT: los jugadores guardados deben conservarse tras recargar').toBe(loadedPlayers);
});

