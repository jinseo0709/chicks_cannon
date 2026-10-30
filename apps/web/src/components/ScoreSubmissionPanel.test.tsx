import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
function makeAuth(initiallySignedIn = false): LeaderboardAuth {
  let signedIn = initiallySignedIn;
  return {
    isConfigured: true,
    hasAccount: async () => signedIn,
    signIn: async () => { signedIn = true; },
    getAccessToken: async () => 'test-access-token',
  };
}

describe('ScoreSubmissionPanel', () => {
  it('requires Microsoft sign-in before collecting a nickname and submitting', async () => {
    const storage = makeStorage();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      participantId: 'opaque-id', nickname: '새싹', bestScore: 3200,
      achievedAt: '2026-10-20T00:00:00.000Z', createdAt: '', updatedAt: '',
    }));
    const client = new LeaderboardClient(fetcher);
    const auth = makeAuth();
    const { rerender } = render(<ScoreSubmissionPanel score={3200} completed={false} client={client} storage={storage} auth={auth} />);
    expect(screen.getByRole('button', { name: 'Microsoft 계정으로 로그인' }).hasAttribute('disabled')).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();

    rerender(<ScoreSubmissionPanel score={3200} completed={true} client={client} storage={storage} auth={auth} />);
    fireEvent.click(screen.getByRole('button', { name: 'Microsoft 계정으로 로그인' }));
    await screen.findByLabelText(/닉네임/);
    const input = screen.getByLabelText(/닉네임/);
    fireEvent.change(input, { target: { value: '새싹' } });
    fireEvent.click(screen.getByRole('button', { name: '점수 등록' }));
    await waitFor(() => expect(screen.getByText('새싹님의 3,200점 기록을 등록했어요!')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer test-access-token' });
    expect(storage.getItem('chicks-cannon:nickname:v1')).toBe('새싹');
  });

  it('reuses the saved nickname and reports a retained higher score', async () => {
    const storage = makeStorage();
    storage.setItem('chicks-cannon:nickname:v1', '새싹');
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(JSON.parse(String(init?.body))).toMatchObject({ nickname: '새싹', score: 100 });
      expect(JSON.parse(String(init?.body))).not.toHaveProperty('participantId');
      return response({
        participantId: 'opaque-id', nickname: '새싹', bestScore: 900,
        achievedAt: '2026-10-20T00:00:00.000Z', createdAt: '', updatedAt: '',
      });
    });
    const auth = makeAuth();
    render(<ScoreSubmissionPanel score={100} completed={true} client={new LeaderboardClient(fetcher)} storage={storage} auth={auth} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Microsoft 계정으로 로그인' }));
    await waitFor(() => expect(screen.getByText('새싹님의 최고 기록 900점을 유지했어요!')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
