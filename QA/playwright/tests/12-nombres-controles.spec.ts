import { expect, test } from '@playwright/test';

import { attachQaEvidence } from '../utils/qaEvidence';

test('[ACCESIBILIDAD] Visitante / Controles interactivos / tienen un nombre identificable', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(15_000);

  const routes = ['/', '/players', '/tiers', '/compare', '/my-team', '/lineups/editor?round=1', '/availability', '/planner', '/market', '/settings/data'];
  const results: Array<{ route: string; interactiveCount: number; unnamed: Array<{ tag: string; type: string | null; text: string }> }> = [];

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.getByRole('main').waitFor({ state: 'visible' });
    const unnamed = await page.locator('a[href]:visible, button:visible, summary:visible, input:not([type="hidden"]):visible, select:visible, textarea:visible').evaluateAll((elements) => elements.flatMap((element) => {
      const control = element as HTMLInputElement;
      const labelledBy = element.getAttribute('aria-labelledby')?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ') ?? '';
      const labelText = 'labels' in control && control.labels ? [...control.labels].map((label) => label.textContent ?? '').join(' ') : '';
      const name = element.getAttribute('aria-label') || labelledBy || labelText || element.getAttribute('placeholder') || element.getAttribute('title') || element.textContent || '';
      return name.trim() ? [] : [{ tag: element.tagName.toLowerCase(), type: element.getAttribute('type'), text: (element.textContent ?? '').trim().slice(0, 80) }];
    }));
    const interactiveCount = await page.locator('a[href]:visible, button:visible, summary:visible, input:not([type="hidden"]):visible, select:visible, textarea:visible').count();
    results.push({ route, interactiveCount, unnamed });
  }

  const unnamedControls = results.flatMap((result) => result.unnamed.map((control) => ({ route: result.route, ...control })));
  await attachQaEvidence(page, testInfo, {
    title: 'Nombre identificable de controles interactivos',
    source: ['docs/release-checklist.md — navegación por teclado y foco visible', 'Solicitud de ampliación QA — probar elementos clicables'],
    status: unnamedControls.length ? 'FAIL' : 'PASS',
    expected: { description: 'Los controles visibles deben exponer texto, etiqueta o nombre accesible que permita identificarlos.' },
    actual: { routes: results, unnamedControls },
  });

  expect(unnamedControls, 'EXPECTED RESULT: ningún control interactivo visible debe carecer de nombre identificable').toEqual([]);
});
