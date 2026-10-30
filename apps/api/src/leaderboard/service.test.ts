import { describe, expect, it, vi } from 'vitest';
import { MemoryLeaderboardStore } from './memory-store';
import { LeaderboardService } from './service';
import { ApiError } from './types';

const participantId = '550e8400-e29b-41d4-a716-446655440000';
const valid = { nickname: '새싹', score: 200, campaignCompleted: true };

describe('LeaderboardService', () => {
  it('counts malformed score fields against the authenticated participant rate limit', async () => {
    const now = new Date('2026-10-20T10:00:00.000Z');
    const service = new LeaderboardService(new MemoryLeaderboardStore(), () => new Date(now));
    for (let index = 0; index < 5; index += 1) {
      await expect(service.submit({ ...valid, score: -1 }, participantId)).rejects.toMatchObject({ code: 'INVALID_SCORE' });
    }
    await expect(service.submit(valid, participantId)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });

  it('rejects malformed authenticated IDs before recording attempts, then stores a valid score', async () => {
    const store = new MemoryLeaderboardStore();
    const limiter = vi.spyOn(store, 'recordSubmissionAttempt');
    const service = new LeaderboardService(store, () => new Date('2026-10-20T10:00:00.000Z'));
    await expect(service.submit(valid, 'bad')).rejects.toBeInstanceOf(ApiError);
    expect(limiter).not.toHaveBeenCalled();
    await expect(service.submit(valid, participantId)).resolves.toMatchObject({ nickname: '새싹', bestScore: 200 });
  });

  it('ignores any participant ID sent in the body and serves validated deterministic pages', async () => {
    const service = new LeaderboardService(new MemoryLeaderboardStore());
    await service.submit({ ...valid, participantId: '00000000-0000-4000-8000-000000000001' }, participantId);
    const page = await service.list(new URLSearchParams('page=1&pageSize=10'));
    expect(page).toMatchObject({ page: 1, pageSize: 10, totalCount: 1, totalPages: 1 });
    expect(page.items[0]?.participantId).toBe(participantId);
    await expect(service.list(new URLSearchParams('page=wat'))).rejects.toMatchObject({ code: 'INVALID_PAGINATION' });
  });
});
