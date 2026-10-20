import { LeaderboardApiError } from './types';
import type { LeaderboardPage, ScoreSubmission, SubmitScoreInput } from './types';

export class LeaderboardClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly baseUrl = '/api/leaderboard',
  ) {}

  async list(page: number, pageSize = 25, signal?: AbortSignal): Promise<LeaderboardPage> {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new LeaderboardApiError(400, 'INVALID_PAGINATION', '순위표 페이지 요청이 올바르지 않습니다.');
    }
    const url = new URL(this.baseUrl, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    const response = await this.fetcher(url.toString(), { method: 'GET', headers: { Accept: 'application/json' }, signal });
    return this.readResponse<LeaderboardPage>(response);
  }

  async submit(input: SubmitScoreInput): Promise<ScoreSubmission> {
    if (input.campaignCompleted !== true) {
      throw new LeaderboardApiError(400, 'CAMPAIGN_INCOMPLETE', '캠페인 완주 후에만 점수를 등록할 수 있습니다.');
    }
    const response = await this.fetcher(this.baseUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = await this.readResponse<{ entry: ScoreSubmission }>(response);
    if (!body.entry || typeof body.entry.bestScore !== 'number') {
      throw new LeaderboardApiError(502, 'INVALID_RESPONSE', '순위 서버 응답을 확인할 수 없습니다.');
    }
    return body.entry;
  }

  private async readResponse<T>(response: Response): Promise<T> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new LeaderboardApiError(response.status || 502, 'INVALID_RESPONSE', '순위 서버 응답을 읽을 수 없습니다.');
    }
    if (!response.ok) {
      const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
      throw new LeaderboardApiError(
        response.status,
        typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
        typeof error?.message === 'string' ? error.message : '순위 요청에 실패했습니다.',
      );
    }
    return body as T;
  }
}
