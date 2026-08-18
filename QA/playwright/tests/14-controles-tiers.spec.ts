import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[INTERACCIONES] Visitante / Tiers / cambia controles y despliega la explicación', async ({ page }, testInfo) => {
  await page.goto('/tiers', { waitUntil: 'networkidle' });
  await expect(page.locator('.tier-player').first(), 'PRECONDICIÓN: Tiers debe terminar de hidratarse').toBeVisible();
  const positionStates: Array<{ name: string; active: boolean }> = [];
  for (const name of ['Delanteros', 'Centrocampistas', 'Defensas', 'Porteros']) {
    const button = page.getByRole('button', { name });
    await button.click();
    await expect(button, `CHECKPOINT: ${name} debe quedar activo`).toHaveClass(/active/);
    positionStates.push({ name, active: true });
  }
  await page.getByLabel('Ordenar por').selectOption('name');
  const firstPlayer = page.locator('.tier-player').first();
  const playerName = (await firstPlayer.locator('a strong').textContent())?.trim() ?? '';
  await page.getByPlaceholder('Jugador…').fill(playerName);
  const filteredPlayer = page.getByRole('link', { name: new RegExp(playerName, 'i') });
  await expect(filteredPlayer, 'CHECKPOINT: debe terminar de aplicarse la búsqueda').toBeVisible();
  const filteredPlayerVisible = true;
  const details = page.locator('.tier-player details').first();
  await details.getByText('Por qué aparece aquí').click();
  await expect(details, 'CHECKPOINT: debe abrirse la explicación').toHaveAttribute('open', '');
  const explanationOpen = true;
  const passed = positionStates.every((state) => state.active) && filteredPlayerVisible && explanationOpen;

  await attachQaEvidence(page, testInfo, {
    title: 'Controles interactivos y explicación de Tiers',
    source: 'README.md — prueba manual de Tiers: posición, equipo, órdenes y “Por qué”',
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'Tiers debe permitir cambiar posición, buscar jugadores, ordenar y desplegar la explicación.' },
    actual: { positionStates, playerName, filteredPlayerVisible, explanationOpen },
  });

  expect(positionStates.every((state) => state.active), 'EXPECTED RESULT: cada selector de posición debe activarse al pulsarlo').toBe(true);
  expect(filteredPlayerVisible, 'EXPECTED RESULT: la búsqueda debe conservar el jugador solicitado').toBe(true);
  expect(explanationOpen, 'EXPECTED RESULT: “Por qué aparece aquí” debe desplegar la explicación').toBe(true);
});
