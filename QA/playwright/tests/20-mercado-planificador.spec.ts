import { expect, type Locator, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

async function firstSelectableValue(select: Locator) {
  return select.locator('option').evaluateAll((options) => options
    .filter((option) => !(option as HTMLOptionElement).disabled && (option as HTMLOptionElement).value)
    .map((option) => (option as HTMLOptionElement).value)[0] ?? '');
}

test('[INTERACCIONES] Usuario local / Mercado y planificador / gestiona precio y escenario', async ({ page }, testInfo) => {
  test.setTimeout(60_000);

  await page.goto('/market', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect(page.getByLabel('Jugador'), 'PRECONDICIÓN: debe existir un jugador seleccionable').not.toHaveValue('');
  await page.getByPlaceholder('1000000').fill('1500000');
  await page.getByPlaceholder('25000').fill('25000');
  await page.getByRole('button', { name: 'Guardar precio' }).click();
  await expect(page.getByRole('status'), 'CHECKPOINT: debe terminar de guardarse el precio').toContainText('1 precios guardados');
  const marketSaveMessage = await page.getByRole('status').textContent();
  const exportButton = page.getByRole('button', { name: 'Exportar', exact: true });
  await expect(exportButton, 'CHECKPOINT: debe habilitarse la exportación').toBeEnabled();
  const marketDownloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const marketDownload = await marketDownloadPromise;
  const marketPath = await marketDownload.path();
  await page.getByRole('button', { name: /^Eliminar precio de / }).click();
  await expect(page.getByRole('status'), 'CHECKPOINT: debe terminar de eliminarse el precio').toContainText('0 precios guardados');
  const afterDeleteMessage = await page.getByRole('status').textContent();
  await page.locator('.market-input input[type="file"]').setInputFiles(marketPath!);
  await expect(page.getByRole('status'), 'CHECKPOINT: debe finalizar la importación de mercado').toContainText('1 precios guardados');
  const marketImportMessage = await page.getByRole('status').textContent();

  await page.goto('/my-team', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cargar plantilla de prueba' }).click();
  await page.getByRole('button', { name: 'Guardar equipo' }).click();
  await page.goto('/planner', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Planificador' }).waitFor();
  await page.getByRole('button', { name: 'Nuevo escenario' }).click();
  const scenario = page.locator('.scenario-grid article').first();
  await scenario.getByLabel('Nombre del escenario').fill('Escenario QA');
  const incoming = scenario.getByLabel('Fichar');
  const incomingValue = await firstSelectableValue(incoming);
  await incoming.selectOption(incomingValue);
  await expect(scenario.locator('.scenario-result strong'), 'CHECKPOINT: debe calcularse el impacto').not.toHaveText('Pendiente');
  const impact = await scenario.locator('.scenario-result strong').textContent();
  await scenario.getByRole('button', { name: 'Eliminar escenario' }).click();
  await expect(page.locator('.scenario-grid article'), 'CHECKPOINT: debe eliminarse el escenario').toHaveCount(0);
  const scenariosAfterDelete = await page.locator('.scenario-grid article').count();
  const passed = marketSaveMessage?.includes('1 precios guardados') === true && afterDeleteMessage?.includes('0 precios guardados') === true && marketImportMessage?.includes('1 precios guardados') === true && Boolean(incomingValue) && impact !== 'Pendiente' && scenariosAfterDelete === 0;

  await attachQaEvidence(page, testInfo, {
    title: 'Interacciones de Mercado y Planificador',
    source: ['README.md — precios aportados, variaciones y planificador de escenarios', 'docs/release-checklist.md — escenario y precio de mercado'],
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'Mercado debe gestionar precios e importación/exportación; Planificador debe crear, completar y eliminar escenarios.' },
    actual: { marketSaveMessage, afterDeleteMessage, marketImportMessage, marketFile: marketDownload.suggestedFilename(), incomingValue, impact, scenariosAfterDelete },
  });

  expect(marketSaveMessage, 'EXPECTED RESULT: Guardar precio debe persistir el valor').toContain('1 precios guardados');
  expect(afterDeleteMessage, 'EXPECTED RESULT: Eliminar precio debe retirar el valor').toContain('0 precios guardados');
  expect(marketImportMessage, 'EXPECTED RESULT: Importar JSON debe recuperar el mercado').toContain('1 precios guardados');
  expect(incomingValue, 'EXPECTED RESULT: el escenario debe permitir seleccionar un fichaje compatible').toBeTruthy();
  expect(impact, 'EXPECTED RESULT: al completar el escenario debe calcularse su impacto').not.toBe('Pendiente');
  expect(scenariosAfterDelete, 'EXPECTED RESULT: Eliminar escenario debe retirarlo').toBe(0);
});
