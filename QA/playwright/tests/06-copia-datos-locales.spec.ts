import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[E2E] Usuario local / Datos locales / exporta, elimina y restaura una copia', async ({ page }, testInfo) => {
  await page.goto('/my-team');
  await page.getByRole('button', { name: 'Cargar plantilla de prueba' }).click();
  const initialPlayers = await page.locator('.squad-editor-row').count();
  await page.getByRole('button', { name: 'Guardar equipo' }).click();

  await page.goto('/settings/data');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia completa' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  await page.getByLabel('Escribe BORRAR para confirmar').fill('BORRAR');
  await page.getByRole('button', { name: 'Eliminar todos los datos locales' }).click();
  const eraseMessage = await page.getByRole('status').textContent();
  await page.locator('input[type="file"]').setInputFiles(downloadPath!);
  await expect(page.getByRole('status'), 'CHECKPOINT: debe finalizar la restauración de la copia').toContainText('restaurados');
  const restoreMessage = await page.getByRole('status').textContent();

  await page.goto('/my-team');
  await expect(page.getByRole('heading', { name: 'Mi equipo', level: 1 }), 'CHECKPOINT: Mi equipo debe terminar de cargar el estado restaurado').toBeVisible();
  const restoredPlayers = await page.locator('.squad-editor-row').count();
  const passed = Boolean(downloadPath && eraseMessage?.includes('eliminado') && restoreMessage?.includes('restaurados') && initialPlayers > 0 && restoredPlayers === initialPlayers);
  await attachQaEvidence(page, testInfo, {
    title: 'Copia integral de datos locales',
    source: ['README.md — /settings/data: copia, restauración y borrado controlado', 'docs/release-checklist.md — Prueba manual, paso 5'],
    status: passed ? 'PASS' : 'FAIL',
    expected: {
      description: 'La copia integral debe permitir eliminar el estado local y restaurarlo posteriormente.',
    },
    actual: { initialPlayers, restoredPlayers, eraseMessage, restoreMessage, downloadSuggestedName: download.suggestedFilename(), url: page.url() },
  });

  expect(downloadPath, 'EXPECTED RESULT: la exportación debe generar un archivo descargable').toBeTruthy();
  expect(eraseMessage, 'EXPECTED RESULT: el borrado confirmado debe eliminar los datos locales').toContain('eliminado');
  expect(restoreMessage, 'EXPECTED RESULT: la copia debe poder restaurarse').toContain('restaurados');
  expect(restoredPlayers, 'EXPECTED RESULT: la plantilla debe reaparecer después de restaurar la copia').toBe(initialPlayers);
});

