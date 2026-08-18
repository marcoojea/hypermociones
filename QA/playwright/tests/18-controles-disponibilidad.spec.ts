import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[INTERACCIONES] Usuario editorial / Disponibilidad / filtra, guarda, exporta, elimina e importa', async ({ page }, testInfo) => {
  await page.goto('/availability');
  await page.getByRole('heading', { name: 'Disponibilidad', level: 1 }).waitFor();
  const playerButton = page.locator('.availability-list button').first();
  await playerButton.click();
  await page.getByLabel(/Estado para la jornada/).selectOption('INJURED');
  await page.getByPlaceholder('Club, RFEF, medio...').fill('Fuente QA controlada');
  await page.getByRole('button', { name: 'Guardar incidencia' }).click();
  const saveMessage = await page.getByRole('status').textContent();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const download = await downloadPromise;
  const exportPath = await download.path();
  await page.getByRole('button', { name: 'Eliminar edición' }).click();
  const deleteMessage = await page.getByRole('status').textContent();
  await page.locator('.availability-rounds input[type="file"]').setInputFiles(exportPath!);
  await expect(page.getByRole('status'), 'CHECKPOINT: debe finalizar la importación de disponibilidad').toContainText('registros importados');
  const importMessage = await page.getByRole('status').textContent();
  await page.getByLabel('Filtrar por estado').selectOption('INCIDENTS');
  const filteredCount = await page.locator('.availability-list button').count();
  const passed = saveMessage?.includes('Guardado') === true && deleteMessage?.includes('eliminada') === true && importMessage?.includes('registros importados') === true && filteredCount > 0;

  await attachQaEvidence(page, testInfo, {
    title: 'Interacciones editoriales de Disponibilidad',
    source: ['README.md — centro editorial con fuente e importación/exportación', 'docs/release-checklist.md — marcar lesión y comprobar estado'],
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'Disponibilidad debe permitir guardar una incidencia con fuente, exportarla, eliminarla, importarla y filtrarla.' },
    actual: { saveMessage, deleteMessage, importMessage, filteredCount, exportedFile: download.suggestedFilename() },
  });

  expect(saveMessage, 'EXPECTED RESULT: Guardar incidencia debe confirmar el guardado').toContain('Guardado');
  expect(deleteMessage, 'EXPECTED RESULT: Eliminar edición debe confirmar el borrado').toContain('eliminada');
  expect(importMessage, 'EXPECTED RESULT: Importar debe recuperar los registros exportados').toContain('registros importados');
  expect(filteredCount, 'EXPECTED RESULT: Solo incidencias debe mostrar el registro importado').toBeGreaterThan(0);
});

