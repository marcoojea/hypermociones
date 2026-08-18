import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

const documentedRoutes = [
  '/',
  '/players',
  '/teams',
  '/fixtures',
  '/data-status',
  '/lineups',
  '/availability',
  '/my-team',
  '/gameweek',
  '/tiers',
  '/rankings',
  '/compare',
  '/planner',
  '/watchlist',
  '/market',
  '/settings/data',
  '/privacy',
  '/terms',
  '/contact',
  '/methodology',
] as const;

test('[SMOKE] Visitante / Áreas documentadas / cargan sin errores de navegación', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const pageErrors: Array<{ path: string; message: string }> = [];
  const results: Array<{
    path: string;
    status: number | null;
    mainVisible: boolean;
    error: string | null;
  }> = [];

  for (const path of documentedRoutes) {
    const routePage = await page.context().newPage();
    routePage.setDefaultNavigationTimeout(15_000);
    routePage.on('pageerror', (error) => {
      pageErrors.push({ path, message: error.message });
    });

    try {
      const response = await routePage.goto(path, { waitUntil: 'networkidle' });
      results.push({
        path,
        status: response?.status() ?? null,
        mainVisible: await routePage.getByRole('main').isVisible(),
        error: null,
      });
    } catch (error) {
      results.push({
        path,
        status: null,
        mainVisible: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await routePage.close();
    }
  }

  await page.goto('/', { waitUntil: 'networkidle' });

  const failedRoutes = results.filter(
    (result) => result.status === null || result.status >= 400 || !result.mainVisible
  );
  const passed = failedRoutes.length === 0 && pageErrors.length === 0;

  await attachQaEvidence(page, testInfo, {
    title: 'Áreas documentadas accesibles',
    source: ['README.md — Estado actual', 'docs/launch-readiness.md — Ya operativo'],
    status: passed ? 'PASS' : 'FAIL',
    expected: {
      description: 'Las áreas declaradas como operativas deben responder sin error y mostrar su contenido principal.',
      routes: documentedRoutes,
    },
    actual: { results, pageErrors },
    technicalError: failedRoutes.map((result) => result.error).filter(Boolean).join('\n') || null,
  });

  expect(failedRoutes, 'EXPECTED RESULT: todas las áreas documentadas deben ser accesibles').toEqual([]);
  expect(pageErrors, 'EXPECTED RESULT: las áreas operativas no deben producir errores JavaScript no controlados').toEqual([]);
});
