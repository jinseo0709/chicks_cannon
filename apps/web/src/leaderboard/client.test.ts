import { describe, expect, it, vi } from 'vitest';
import { LeaderboardApiError } from './types';
import { LeaderboardClient } from './client';

describe('LeaderboardClient', () => {
  it('requests paginated data and forwards its abort signal', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      items: [], page: 2, pageSize: 10, totalCount: 0, totalPages: 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const client = new LeaderboardClient(fetcher);
    const controller = new AbortController();
    await expect(client.list(2, 10, controller.signal)).resolves.toMatchObject({ page: 2, pageSize: 10 });
    expect(fetcher.mock.calls[0][0]).toContain('/api/leaderboard?page=2&pageSize=10');
    expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it('submits scores with a bearer token and no caller supplied identity', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      entry: { participantId: 'p', nickname: '새싹', bestScore: 200, achievedAt: '', createdAt: '', updatedAt: '' },
    }), { status: 200 }));
    const client = new LeaderboardClient(fetcher);
    await expect(client.submit({ nickname: '새싹', score: 200, campaignCompleted: true }, 'test-token'))
      .resolves.toMatchObject({ bestScore: 200 });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: {
      'Content-Type': 'application/json', Authorization: 'Bearer test-token',
    } });
    expect(fetcher.mock.calls[0][1]?.body).toBe(JSON.stringify({ nickname: '새싹', score: 200, campaignCompleted: true }));
  });

  it('rejects invalid pagination, missing token, and incomplete campaigns before network access', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new LeaderboardClient(fetcher);
    await expect(client.list(0)).rejects.toBeInstanceOf(LeaderboardApiError);
    await expect(client.list(1, 101)).rejects.toBeInstanceOf(LeaderboardApiError);
    await expect(client.submit({ nickname: '새싹', score: 20, campaignCompleted: true }, ' '))
      .rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
    await expect(client.submit({ nickname: '새싹', score: 20, campaignCompleted: false as true }, 'token'))
      .rejects.toMatchObject({ code: 'CAMPAIGN_INCOMPLETE' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
