import { describe, expect, it } from 'vitest';
import type { HttpRequest, HttpResponseInit } from '@azure/functions';
import { createLeaderboardHandlers } from './leaderboard';
import { MemoryLeaderboardStore } from '../leaderboard/memory-store';
import { LeaderboardService } from '../leaderboard/service';

const participantId = '550e8400-e29b-41d4-a716-446655440000';

function makeRequest(options: {
  method?: string;
  query?: URLSearchParams;
  body?: unknown;
  malformedJson?: boolean;
  authorization?: string;
} = {}): HttpRequest {
  return {
    method: options.method ?? 'GET',
    query: options.query ?? new URLSearchParams(),
    json: options.malformedJson
      ? async () => { throw new SyntaxError('bad json'); }
      : async () => options.body,
    headers: new Headers(options.authorization ? { authorization: options.authorization } : {}),
  } as unknown as HttpRequest;
}

function jsonBody(response: HttpResponseInit): Record<string, unknown> {
  return response.jsonBody as Record<string, unknown>;
}

describe('leaderboard HTTP handlers', () => {
  it('returns a paginated JSON GET response and 400 for invalid query', async () => {
    const handlers = createLeaderboardHandlers(new LeaderboardService(new MemoryLeaderboardStore()), async () => participantId);
    const response = await handlers.get(makeRequest({ query: new URLSearchParams('page=1&pageSize=25') }));
    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject({ 'Content-Type': 'application/json; charset=utf-8' });
    expect(jsonBody(response)).toMatchObject({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 });
    expect((await handlers.get(makeRequest({ query: new URLSearchParams('page=0') }))).status).toBe(400);
  });

  it('accepts completed campaign submissions and returns validation errors safely', async () => {
    const handlers = createLeaderboardHandlers(new LeaderboardService(new MemoryLeaderboardStore()), async () => participantId);
    const valid = { participantId, nickname: '새싹', score: 1000, campaignCompleted: true };
    const submitted = await handlers.post(makeRequest({ method: 'POST', body: valid }));
    expect(submitted.status).toBe(200);
    expect(jsonBody(submitted)).toHaveProperty('entry');
    const invalid = await handlers.post(makeRequest({ method: 'POST', body: { ...valid, nickname: '<img>' } }));
    expect(invalid.status).toBe(400);
    expect(jsonBody(invalid)).toMatchObject({ error: { code: 'INVALID_NICKNAME' } });
    expect(JSON.stringify(jsonBody(invalid))).not.toContain('<img>');
  });

  it('handles malformed JSON, rate limits, and hides unexpected exception details', async () => {
    const store = new MemoryLeaderboardStore();
    const fixed = new Date('2026-10-20T12:00:00.000Z');
    const handlers = createLeaderboardHandlers(new LeaderboardService(store, () => new Date(fixed)), async () => participantId);
    const malformed = await handlers.post(makeRequest({ method: 'POST', malformedJson: true }));
    expect(malformed.status).toBe(400);

    const valid = { participantId, nickname: '새싹', score: 10, campaignCompleted: true };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await handlers.post(makeRequest({ method: 'POST', body: valid }))).status).toBe(200);
    }
    const limited = await handlers.post(makeRequest({ method: 'POST', body: valid }));
    expect(limited.status).toBe(429);
    expect(limited.headers).toMatchObject({ 'Retry-After': '600' });
    expect(jsonBody(limited)).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('rejects unauthenticated requests before reading or saving their submitted identity', async () => {
    const handlers = createLeaderboardHandlers(new LeaderboardService(new MemoryLeaderboardStore()), async () => {
      const { ApiError } = await import('../leaderboard/types');
      throw new ApiError(401, 'AUTHENTICATION_REQUIRED', '로그인이 필요합니다.');
    });
    const response = await handlers.post(makeRequest({ method: 'POST', body: {
      participantId, nickname: '테스트', score: 1000, campaignCompleted: true,
    } }));
    expect(response.status).toBe(401);
    expect(jsonBody(response)).toMatchObject({ error: { code: 'AUTHENTICATION_REQUIRED' } });
  });
});
