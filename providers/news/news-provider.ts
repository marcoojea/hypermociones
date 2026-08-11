export interface NewsItemInput { externalId: string; title: string; url: string; publishedAt: Date; rawText?: string; }

export interface NewsProvider {
  readonly code: string;
  getLatest(since: Date): Promise<readonly NewsItemInput[]>;
}
