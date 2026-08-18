import { test, expect } from '@playwright/test';
import { attachQaEvidence } from '../utils/qaEvidence';

test(
  '[SMOKE] La aplicación carga correctamente',
  async ({ page }, testInfo) => {
    const expectedResult = {
      description: 'La aplicación debe cargar la página principal',
      path: '/',
    };

    await page.goto('/');

    const actualResult = {
      url: page.url(),
    };

    await attachQaEvidence(page, testInfo, {
      title: 'Smoke - Página principal',
      source: 'README.md — Dashboard de entrada orientado a jugadores y jornada',
      status: page.url().endsWith('/') ? 'PASS' : 'FAIL',
      expected: expectedResult,
      actual: actualResult,
    });

    await expect(
      page,
      'EXPECTED RESULT: la aplicación debe cargar la página principal'
    ).toHaveURL('/');
  }
);
