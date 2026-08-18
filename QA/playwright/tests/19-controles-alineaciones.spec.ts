import { expect, type Locator, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

async function firstSelectableValue(select: Locator) {
  return select.locator('option').evaluateAll((options) => options
    .filter((option) => !(option as HTMLOptionElement).disabled && (option as HTMLOptionElement).value)
    .map((option) => (option as HTMLOptionElement).value)[0] ?? '');
}

test('[INTERACCIONES] Usuario editorial / Alineaciones / cambia, exporta, restaura e importa el borrador', async ({ page }, testInfo) => {
  test.setTimeout(60_000);

  await page.goto('/lineups/editor?round=1', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Editor de alineaciones' }).waitFor();
  const formation = page.locator('.editor-toolbar label').filter({ hasText: 'Formación' }).locator('select');
  await expect(formation, 'PRECONDICIÓN: debe estar disponible el selector de formación').toBeVisible();
  await formation.selectOption('4-3-3');
  await expect(formation, 'CHECKPOINT: debe aplicarse la formación seleccionada').toHaveValue('4-3-3');
  const confidence = page.getByLabel(/^Confianza /).first();
  await confidence.fill('73');
  const bench = page.getByLabel('Añadir jugador');
  const benchValue = await firstSelectableValue(bench);
  await bench.selectOption(benchValue);
  await page.getByPlaceholder('Lesiones, rotaciones, declaraciones del entrenador, alternativas…').fill('Interacción QA');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  const exportPath = await download.path();
  await page.getByRole('button', { name: 'Restaurar borrador' }).click();
  await expect(page.getByRole('status'), 'CHECKPOINT: debe terminar la restauración').toContainText('restaurado');
  const resetMessage = await page.getByRole('status').textContent();
  await page.locator('.editor-data-card input[type="file"]').setInputFiles(exportPath!);
  await expect(page.getByRole('status'), 'CHECKPOINT: debe finalizar la importación de alineación').toContainText('Alineación importada');
  const importMessage = await page.getByRole('status').textContent();
  await page.getByRole('button', { name: 'Guardar alineación' }).click();
  await expect(page.getByRole('status'), 'CHECKPOINT: debe terminar el guardado').toContainText('Guardada');
  const saveMessage = await page.getByRole('status').textContent();
  const passed = resetMessage?.includes('restaurado') === true && importMessage?.includes('importada') === true && saveMessage?.includes('Guardada') === true;

  await attachQaEvidence(page, testInfo, {
    title: 'Controles del editor de alineaciones',
    source: ['README.md — editor con formaciones, confianza, banquillo e importación/exportación JSON', 'docs/release-checklist.md — guardar alineación'],
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'El editor debe admitir cambios, exportación, restauración, importación y guardado.' },
    actual: { formation: await formation.inputValue(), confidence: await confidence.inputValue(), benchValue, resetMessage, importMessage, saveMessage, exportedFile: download.suggestedFilename() },
  });

  expect(resetMessage, 'EXPECTED RESULT: Restaurar borrador debe confirmar la restauración').toContain('restaurado');
  expect(importMessage, 'EXPECTED RESULT: Importar JSON debe recuperar la alineación').toContain('importada');
  expect(saveMessage, 'EXPECTED RESULT: Guardar alineación debe confirmar el guardado').toContain('Guardada');
});
