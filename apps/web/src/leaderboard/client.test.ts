import { describe, expect, it, vi } from 'vitest';
import { LeaderboardApiError } from './types';
import { LeaderboardClient } from './client';

describe('LeaderboardClient', () => {
  it('requests the paginated API endpoint and forwards abort signal', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      items: [], page: 2, pageSize: 10, totalCount: 0, totalPages: 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const client = new LeaderboardClient(fetcher);
    const controller = new AbortController();
    await expect(client.list(2, 10, controller.signal)).resolves.toMatchObject({ page: 2, pageSize: 10 });
    expect(fetcher.mock.calls[0][0]).toContain('/api/leaderboard?page=2&pageSize=10');
    expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it('submits a completed score with JSON headers and maps typed API errors', async () => {
    const success = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      entry: { participantId: 'p', nickname: '새싹', bestScore: 200, achievedAt: '2026-10-20T00:00:00.000Z', createdAt: '', updatedAt: '' },
    }), { status: 200 }));
    const client = new LeaderboardClient(success);
    await expect(client.submit({ participantId: 'p', nickname: '새싹', score: 200, campaignCompleted: true }))
      .resolves.toMatchObject({ bestScore: 200 });
    expect(success.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(success.mock.calls[0][1]?.body).toContain('"campaignCompleted":true');

    const failed = new LeaderboardClient(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'RATE_LIMITED', message: '잠시 후 다시 시도하세요.' },
    }), { status: 429 })));
    await expect(failed.list(1)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });

  it('rejects invalid pagination and incomplete campaigns before a network request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new LeaderboardClient(fetcher);
    await expect(client.list(0)).rejects.toBeInstanceOf(LeaderboardApiError);
    await expect(client.list(1, 101)).rejects.toBeInstanceOf(LeaderboardApiError);
    await expect(client.submit({ participantId: 'p', nickname: '새싹', score: 20, campaignCompleted: false as true }))
      .rejects.toMatchObject({ code: 'CAMPAIGN_INCOMPLETE' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
