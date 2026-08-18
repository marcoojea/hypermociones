import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[E2E] Usuario local / Alineaciones / guarda una edición y la muestra en el centro', async ({ page }, testInfo) => {
  const note = `Nota QA ${Date.now()}`;
  await page.goto('/lineups/editor?round=1');
  await page.getByPlaceholder('Lesiones, rotaciones, declaraciones del entrenador, alternativas…').fill(note);
  await page.getByRole('button', { name: 'Guardar alineación' }).click();
  const saveConfirmation = await page.getByRole('status').textContent();

  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Alineaciones' }).click();
  const noteVisible = await page.getByText(note, { exact: true }).isVisible();
  const passed = Boolean(saveConfirmation?.includes('Guardada') && noteVisible);
  await attachQaEvidence(page, testInfo, {
    title: 'Alineación guardada visible en el centro',
    source: 'docs/release-checklist.md — Prueba manual, paso 4',
    status: passed ? 'PASS' : 'FAIL',
    expected: {
      description: 'Una alineación guardada debe aparecer en el centro de alineaciones.',
    },
    actual: { note, saveConfirmation, noteVisible, url: page.url() },
  });

  expect(saveConfirmation, 'EXPECTED RESULT: el editor debe confirmar que la alineación quedó guardada').toContain('Guardada');
  expect(noteVisible, 'EXPECTED RESULT: la edición guardada debe mostrarse en el centro de alineaciones').toBe(true);
});

