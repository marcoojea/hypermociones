import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[INTERACCIONES] Visitante / Jugadores / aplica filtros, ordena y limpia la consulta', async ({ page }, testInfo) => {
  await page.goto('/players');
  await page.getByLabel('Posición').selectOption('POR');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page, 'CHECKPOINT: debe completarse la aplicación del filtro').toHaveURL((url) => url.searchParams.get('position') === 'POR');
  const filterApplied = new URL(page.url()).searchParams.get('position') === 'POR';
  await page.getByRole('link', { name: /Minutos/ }).click();
  await expect(page, 'CHECKPOINT: debe completarse el cambio de orden').toHaveURL((url) => url.searchParams.get('sort') === 'minutes');
  const sortApplied = new URL(page.url()).searchParams.get('sort') === 'minutes';
  await page.getByRole('link', { name: 'Limpiar' }).click();
  await expect(page, 'CHECKPOINT: debe completarse la limpieza').toHaveURL((url) => url.pathname === '/players' && url.search === '');
  const cleaned = new URL(page.url()).pathname === '/players' && !new URL(page.url()).search;
  const passed = filterApplied && sortApplied && cleaned;

  await attachQaEvidence(page, testInfo, {
    title: 'Filtros, ordenación y limpieza de Jugadores',
    source: 'README.md — /players: filtros por equipo, posición y estado, y ordenación por métricas',
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'Los controles de jugadores deben aplicar filtros, cambiar la ordenación y permitir limpiar la consulta.' },
    actual: { filterApplied, sortApplied, cleaned, url: page.url() },
  });

  expect(filterApplied, 'EXPECTED RESULT: el filtro de posición debe aplicarse').toBe(true);
  expect(sortApplied, 'EXPECTED RESULT: el enlace de Minutos debe cambiar la ordenación').toBe(true);
  expect(cleaned, 'EXPECTED RESULT: Limpiar debe retirar los parámetros de filtro').toBe(true);
});
