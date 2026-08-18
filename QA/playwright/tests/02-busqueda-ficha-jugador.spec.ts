import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[E2E] Visitante / Jugadores / busca un jugador y abre su ficha', async ({ page }, testInfo) => {
  await page.goto('/players');

  const playerLinks = page.locator('main a[href^="/player/"]');
  await expect(playerLinks, 'PRECONDICIÓN: debe existir al menos un jugador en el catálogo documentado').not.toHaveCount(0);
  const selectedLink = playerLinks.first();
  const playerName = (await selectedLink.locator('strong').textContent())?.trim() ?? '';
  const playerPath = await selectedLink.getAttribute('href');

  await page.getByPlaceholder('Buscar jugador o equipo...').fill(playerName);
  await page.getByRole('button', { name: 'Aplicar' }).click();
  const filteredPlayer = page.getByRole('link', { name: new RegExp(playerName, 'i') });
  await expect(filteredPlayer, 'CHECKPOINT: debe terminar de aplicarse la búsqueda').toBeVisible();
  const filteredVisible = true;
  await filteredPlayer.click();
  await expect(page, 'CHECKPOINT: debe completarse la navegación a la ficha').toHaveURL(playerPath!);
  await expect(page.getByRole('heading', { level: 1 }), 'CHECKPOINT: debe terminar de cargarse la ficha').toContainText(playerName);
  const profileHeading = await page.getByRole('heading', { level: 1 }).textContent();
  const passed = Boolean(playerName && playerPath && filteredVisible && profileHeading?.includes(playerName));

  await attachQaEvidence(page, testInfo, {
    title: 'Búsqueda y acceso a ficha de jugador',
    source: 'README.md — /players: búsqueda por nombre/equipo; /player/{slug}: perfil',
    status: passed ? 'PASS' : 'FAIL',
    expected: {
      description: 'La búsqueda debe permitir localizar un jugador del catálogo y abrir su ficha.',
    },
    actual: { playerName, playerPath, filteredVisible, profileHeading, url: page.url() },
  });

  expect(filteredVisible, 'EXPECTED RESULT: el jugador buscado debe aparecer en los resultados').toBe(true);
  await expect(page, 'EXPECTED RESULT: debe abrirse la ficha del jugador seleccionado').toHaveURL(playerPath!);
  await expect(page.getByRole('heading', { level: 1 }), 'EXPECTED RESULT: la ficha debe identificar al jugador seleccionado').toContainText(playerName);
});
