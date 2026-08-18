import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[INTERACCIONES] Usuario local / Mi equipo / exporta, importa, añade, quita y reinicia', async ({ page }, testInfo) => {
  await page.goto('/my-team');
  await page.getByRole('button', { name: 'Cargar plantilla de prueba' }).click();
  const rows = page.locator('.squad-editor-row');
  const initialCount = await rows.count();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const download = await downloadPromise;
  const exportPath = await download.path();
  await rows.first().getByRole('button', { name: /^Quitar / }).click();
  const countAfterRemove = await rows.count();
  await page.getByRole('button', { name: 'Reiniciar Mi equipo' }).click();
  const countAfterReset = await rows.count();
  await page.locator('.my-team-candidates button').first().click();
  const countAfterManualAdd = await rows.count();
  await page.getByRole('button', { name: 'Reiniciar Mi equipo' }).click();
  await page.locator('.my-team-toolbar input[type="file"]').setInputFiles(exportPath!);
  await expect(page.getByRole('status'), 'CHECKPOINT: debe finalizar la importación del equipo').toContainText('jugadores importados');
  const countAfterImport = await rows.count();
  await page.getByRole('button', { name: 'Guardar equipo' }).click();
  const saveMessage = await page.getByRole('status').textContent();
  const passed = initialCount > 0 && countAfterRemove === initialCount - 1 && countAfterReset === 0 && countAfterManualAdd === 1 && countAfterImport === initialCount && saveMessage?.includes('Equipo guardado') === true;

  await attachQaEvidence(page, testInfo, {
    title: 'Botones y transferencia de Mi equipo',
    source: ['README.md — Mi equipo manual y copia JSON', 'docs/release-checklist.md — cargar, modificar, guardar y recargar'],
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'Mi equipo debe permitir exportar, quitar, reiniciar, añadir, importar y guardar el estado local.' },
    actual: { initialCount, countAfterRemove, countAfterReset, countAfterManualAdd, countAfterImport, exportedFile: download.suggestedFilename(), saveMessage },
  });

  expect(countAfterRemove, 'EXPECTED RESULT: Quitar debe retirar un jugador').toBe(initialCount - 1);
  expect(countAfterReset, 'EXPECTED RESULT: Reiniciar debe vaciar la plantilla').toBe(0);
  expect(countAfterManualAdd, 'EXPECTED RESULT: el botón de candidato debe añadir un jugador').toBe(1);
  expect(countAfterImport, 'EXPECTED RESULT: Importar debe recuperar la plantilla exportada').toBe(initialCount);
  expect(saveMessage, 'EXPECTED RESULT: Guardar equipo debe confirmar el guardado').toContain('Equipo guardado');
});

