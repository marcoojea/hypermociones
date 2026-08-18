import { Page, TestInfo } from '@playwright/test';

type QaEvidence = {
  title: string;
  source: string | string[];
  status: 'PASS' | 'FAIL' | 'NOT TESTED' | 'NEEDS CLARIFICATION';
  expected: unknown;
  actual: unknown;
  technicalError?: string | null;
};

export async function attachQaEvidence(
  page: Page,
  testInfo: TestInfo,
  evidence: QaEvidence
) {
  await testInfo.attach(
    `${evidence.title} - Resultado QA`,
    {
      body: Buffer.from(
        JSON.stringify(
          {
            case: evidence.title,
            source: evidence.source,
            status: evidence.status,
            expected: evidence.expected,
            actual: evidence.actual,
            execution: {
              project: testInfo.project.name,
              url: page.url(),
              viewport: page.viewportSize(),
            },
            technicalError: evidence.technicalError ?? null,
          },
          null,
          2
        )
      ),
      contentType: 'application/json',
    }
  );
}
