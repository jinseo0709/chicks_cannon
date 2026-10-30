import { describe, expect, it } from 'vitest';
import { MemoryLeaderboardStore } from './memory-store';
import type { SubmitScoreRequest } from './types';

const baseTime = new Date('2026-10-20T09:00:00.000Z');
const request = (participantId: string, nickname: string, score: number): SubmitScoreRequest => ({
  participantId, nickname, score, campaignCompleted: true,
});

describe('MemoryLeaderboardStore', () => {
  it('upserts each participant best without downgrading score or achieved time', async () => {
    const store = new MemoryLeaderboardStore();
    const first = await store.submitBest(request('a', '새싹', 100), baseTime);
    const lower = await store.submitBest(request('a', '새친구', 80), new Date(baseTime.getTime() + 1000));
    const higher = await store.submitBest(request('a', '고수새', 250), new Date(baseTime.getTime() + 2000));
    expect(first.createdAt).toBe(baseTime.toISOString());
    expect(lower.bestScore).toBe(100);
    expect(lower.achievedAt).toBe(first.achievedAt);
    expect(lower.nickname).toBe('새친구');
    expect(higher.bestScore).toBe(250);
    expect(higher.achievedAt).toBe(new Date(baseTime.getTime() + 2000).toISOString());
    expect(higher.createdAt).toBe(first.createdAt);
  });

  it('orders by score and achievement time, assigns competition ranks, and paginates', async () => {
    const store = new MemoryLeaderboardStore();
    await store.submitBest(request('b', '두리', 900), baseTime);
    await store.submitBest(request('a', '아리', 900), new Date(baseTime.getTime() + 1000));
    await store.submitBest(request('c', '초롱', 500), baseTime);
    const first = await store.list(1, 2);
    const second = await store.list(2, 2);
    expect(first.items.map((entry) => [entry.participantId, entry.rank])).toEqual([['b', 1], ['a', 1]]);
    expect(second.items.map((entry) => [entry.participantId, entry.rank])).toEqual([['c', 3]]);
    expect(first.totalCount).toBe(3);
    expect(first.totalPages).toBe(2);
  });

  it('returns an empty, zero-page result before the first submission', async () => {
    expect(await new MemoryLeaderboardStore().list(1, 25)).toEqual({
      items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0,
    });
  });
});
