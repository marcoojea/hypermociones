import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[E2E] Usuario local / Tiers y seguimiento / añade un jugador al radar', async ({ page }, testInfo) => {
  await page.goto('/tiers');
  const followButtons = page.getByRole('button', { name: /^Seguir a / });
  await expect(followButtons, 'PRECONDICIÓN: debe existir un jugador evaluable para seguimiento').not.toHaveCount(0);
  const followButton = followButtons.first();
  const accessibleName = await followButton.getAttribute('aria-label');
  const playerName = accessibleName?.replace(/^Seguir a /, '') ?? '';
  await followButton.click();
  await expect(page.getByRole('button', { name: new RegExp(`^Quitar ${playerName} de seguimiento$`) }), 'CHECKPOINT: debe persistirse el seguimiento antes de navegar').toBeVisible();

  const watchlistLink = page.locator('footer').getByRole('link', { name: 'Seguimiento' });
  await watchlistLink.click();
  await expect(page, 'CHECKPOINT: debe completarse la navegación a Seguimiento').toHaveURL('/watchlist');
  const watchedPlayer = page.getByRole('heading', { name: playerName, level: 2 });
  await expect(watchedPlayer, 'CHECKPOINT: debe terminar de cargarse el jugador seguido').toBeVisible();
  const watchedPlayerVisible = await watchedPlayer.isVisible();
  const passed = Boolean(playerName && watchedPlayerVisible);
  await attachQaEvidence(page, testInfo, {
    title: 'Jugador añadido desde Tiers a Seguimiento',
    source: 'docs/release-checklist.md — Prueba manual, paso 10',
    status: passed ? 'PASS' : 'FAIL',
    expected: {
      description: 'Un jugador marcado con estrella en Tiers debe aparecer en Seguimiento.',
    },
    actual: { playerName, watchedPlayerVisible, url: page.url() },
  });

  expect(watchedPlayerVisible, 'EXPECTED RESULT: el jugador marcado debe aparecer en Seguimiento').toBe(true);
});
