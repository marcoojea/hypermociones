import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[INTERACCIONES] Visitante / Fichas / usa acciones de jugador y equipo', async ({ page }, testInfo) => {
  await page.goto('/players');
  const playerLink = page.locator('main a[href^="/player/"]').first();
  const playerPath = await playerLink.getAttribute('href');
  await playerLink.click();
  const addToTeam = page.getByRole('button', { name: '+ Añadir a Mi equipo' });
  await addToTeam.click();
  const playerAdded = await page.getByRole('button', { name: 'En Mi equipo ✓' }).isDisabled();

  await page.goto('/teams');
  const teamLink = page.locator('main a[href^="/team/"]').first();
  const teamPath = await teamLink.getAttribute('href');
  await teamLink.click();
  const editHref = await page.getByRole('link', { name: 'Editar alineación →' }).getAttribute('href');
  const roundHref = await page.getByRole('link', { name: 'Ver jornada' }).getAttribute('href');
  const actionResults: Array<{ action: string; destination: string }> = [];
  for (const [action, name, expectedHref] of [['Editar alineación', 'Editar alineación →', editHref], ['Ver jornada', 'Ver jornada', roundHref]] as const) {
    await page.goto(teamPath!, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name }).click();
    await expect(page, `CHECKPOINT: ${action} debe completar su navegación`).toHaveURL(expectedHref!);
    actionResults.push({ action, destination: `${new URL(page.url()).pathname}${new URL(page.url()).search}` });
  }
  const passed = Boolean(playerPath && playerAdded && teamPath && editHref && roundHref && actionResults[0]?.destination === editHref && actionResults[1]?.destination === roundHref);

  await attachQaEvidence(page, testInfo, {
    title: 'Acciones disponibles en fichas de jugador y equipo',
    source: ['README.md — fichas de jugador y equipo', 'README.md — Mi equipo y editor de alineaciones'],
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'La ficha de jugador debe permitir añadirlo a Mi equipo y la ficha de equipo debe abrir el editor y la jornada.' },
    actual: { playerPath, playerAdded, teamPath, editHref, roundHref, actionResults },
  });

  expect(playerAdded, 'EXPECTED RESULT: el botón de ficha debe añadir el jugador a Mi equipo y quedar deshabilitado').toBe(true);
  expect(actionResults[0]?.destination, 'EXPECTED RESULT: Editar alineación debe abrir el editor del equipo').toBe(editHref);
  expect(actionResults[1]?.destination, 'EXPECTED RESULT: Ver jornada debe abrir el centro de alineaciones').toBe(roundHref);
});
