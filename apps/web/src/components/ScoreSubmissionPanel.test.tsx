import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScoreSubmissionPanel } from './ScoreSubmissionPanel';
import { LeaderboardClient } from '../leaderboard/client';
import type { LeaderboardAuth } from '../leaderboard/auth';

function makeStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
}

const response = (entry: unknown) => new Response(JSON.stringify({ entry }), { status: 200 });
const signedInAuth: LeaderboardAuth = {
  isConfigured: true,
  hasAccount: async () => true,
  signIn: async () => undefined,
  getAccessToken: async () => 'test-access-token',
};

describe('ScoreSubmissionPanel', () => {
  afterEach(cleanup);

  it('automatically registers with an anonymous default nickname on the first completion', async () => {
    const storage = makeStorage();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      participantId: 'opaque-id', nickname: '병아리 모험가', bestScore: 900,
      achievedAt: '2026-10-20T00:00:00.000Z', createdAt: '', updatedAt: '',
    }));
    render(<ScoreSubmissionPanel score={100} completed={true} client={new LeaderboardClient(fetcher)} storage={storage} auth={signedInAuth} />);
    await waitFor(() => expect(screen.getByText('병아리 모험가님의 최고 기록 900점을 유지했어요!')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ nickname: '병아리 모험가', score: 100 });
    expect(storage.getItem('chicks-cannon:nickname:v1')).toBe('병아리 모험가');
  });

  it('automatically registers a completed campaign using the saved nickname', async () => {
    const storage = makeStorage();
    storage.setItem('chicks-cannon:nickname:v1', '새싹');
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      participantId: 'opaque-id', nickname: '새싹', bestScore: 3200,
      achievedAt: '2026-10-20T00:00:00.000Z', createdAt: '', updatedAt: '',
    }));
    const client = new LeaderboardClient(fetcher);
    const { rerender } = render(<ScoreSubmissionPanel score={3200} completed={false} client={client} storage={storage} auth={signedInAuth} />);
    expect(fetcher).not.toHaveBeenCalled();

    rerender(<ScoreSubmissionPanel score={3200} completed={true} client={client} storage={storage} auth={signedInAuth} />);
    await waitFor(() => expect(screen.getByText('새싹님의 3,200점 기록을 순위표에 등록했어요!')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer test-access-token' });
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).not.toHaveProperty('participantId');
  });
});
