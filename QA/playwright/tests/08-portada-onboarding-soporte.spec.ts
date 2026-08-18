import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[LANZAMIENTO] Visitante / Portada / explica cómo empezar y enlaza confianza y soporte', async ({ page }, testInfo) => {
  await page.goto('/');
  const onboardingVisible = await page.getByRole('heading', { name: 'Tu jornada, preparada en tres pasos.' }).isVisible();
  const trustVisible = await page.getByRole('heading', { name: 'Datos identificados. Ausencias visibles. Control local.' }).isVisible();
  const legalNavigation = page.getByRole('navigation', { name: 'Información legal y soporte' });
  const visibleLegalLinks = await Promise.all(['Metodología', 'Datos locales', 'Privacidad', 'Condiciones', 'Contacto'].map(async (name) => ({
    name,
    visible: await legalNavigation.getByRole('link', { name }).isVisible(),
  })));
  const passed = onboardingVisible && trustVisible && visibleLegalLinks.every((link) => link.visible);

  await attachQaEvidence(page, testInfo, {
    title: 'Onboarding y superficies de confianza de la portada',
    source: ['docs/launch-readiness.md — Onboarding, confianza y acceso a soporte', 'docs/launch-plan.md — Fase 1: base técnica y confianza'],
    status: passed ? 'PASS' : 'FAIL',
    expected: { description: 'La portada debe explicar el recorrido inicial y hacer accesibles metodología, datos locales, privacidad, condiciones y contacto.' },
    actual: { onboardingVisible, trustVisible, visibleLegalLinks, url: page.url() },
  });

  expect(onboardingVisible, 'EXPECTED RESULT: un usuario nuevo debe encontrar un recorrido inicial claro').toBe(true);
  expect(trustVisible, 'EXPECTED RESULT: la portada debe explicar las garantías de datos y privacidad').toBe(true);
  expect(visibleLegalLinks.every((link) => link.visible), 'EXPECTED RESULT: la navegación legal y de soporte debe estar visible').toBe(true);
});

