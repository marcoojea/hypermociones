import { expect, type Locator, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

async function firstSelectableValue(select: Locator) {
  return select.locator('option').evaluateAll((options) => options
    .filter((option) => !(option as HTMLOptionElement).disabled && (option as HTMLOptionElement).value)
    .map((option) => (option as HTMLOptionElement).value)[0] ?? '');
}

test('[INTERACCIONES] Visitante / Comparador / añade, explica, sigue y quita jugadores', async ({ page }, testInfo) => {
  test.setTimeout(60_000);

  await page.goto('/compare', { waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  const thirdSelector = page.getByLabel('Jugador 3');
  const thirdValue = await firstSelectableValue(thirdSelector);
  await thirdSelector.selectOption(thirdValue);
  const cards = page.locator('.compare-card');
  await expect(cards, 'CHECKPOINT: debe renderizarse el tercer jugador').toHaveCount(3);
  const cardsAfterAdd = await cards.count();
  const firstCard = cards.first();
  const explanation = firstCard.locator('details');
  await explanation.getByText('Explicación').click();
  await expect(explanation, 'CHECKPOINT: debe abrirse la explicación').toHaveAttribute('open', '');
  const explanationOpen = true;
  const followButton = firstCard.getByRole('button', { name: /^Seguir a / });
  await followButton.click();
  const unfollowButton = firstCard.getByRole('button', { name: /^Quitar .* de seguimiento$/ });
  await expect(unfollowButton, 'CHECKPOINT: debe actualizarse el estado de seguimiento').toBeVisible();
  const followToggled = true;
  await cards.nth(2).getByRole('button', { name: 'Quitar' }).click();
  await expect(cards, 'CHECKPOINT: debe retirarse el tercer jugador').toHaveCount(2);
  const cardsAfterRemove = await cards.count();
  const passed = cardsAfterAdd === 3 && explanationOpen && followToggled && cardsAfterRemove === 2;

  await attachQaEvidence(page, testInfo, {
    title: 'Interacciones del comparador',
    source: 'README.md — /compare: comparación de hasta cuatro jugadores con recomendación',
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'El comparador debe permitir añadir y quitar jugadores, abrir su explicación y alternar seguimiento.' },
    actual: { cardsAfterAdd, explanationOpen, followToggled, cardsAfterRemove },
  });

  expect(cardsAfterAdd, 'EXPECTED RESULT: debe poder añadirse un tercer jugador').toBe(3);
  expect(explanationOpen, 'EXPECTED RESULT: la explicación debe poder desplegarse').toBe(true);
  expect(followToggled, 'EXPECTED RESULT: la estrella debe alternar el seguimiento').toBe(true);
  expect(cardsAfterRemove, 'EXPECTED RESULT: Quitar debe retirar el tercer jugador').toBe(2);
});
