import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScoreSubmissionPanel } from './ScoreSubmissionPanel';
import { LeaderboardClient } from '../leaderboard/client';

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

describe('ScoreSubmissionPanel', () => {
  it('never submits a partial campaign and remembers the successful participant and nickname', async () => {
    const storage = makeStorage();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      participantId: '550e8400-e29b-41d4-a716-446655440000', nickname: '새싹', bestScore: 3200,
      achievedAt: '2026-10-20T00:00:00.000Z', createdAt: '', updatedAt: '',
    }));
    const client = new LeaderboardClient(fetcher);
    const { rerender } = render(<ScoreSubmissionPanel score={3200} completed={false} client={client} storage={storage} />);
    expect(screen.getByRole('button', { name: '순위 등록' }).hasAttribute('disabled')).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();

    rerender(<ScoreSubmissionPanel score={3200} completed={true} client={client} storage={storage} />);
    fireEvent.click(screen.getByRole('button', { name: '순위 등록' }));
    const input = screen.getByLabelText(/닉네임/);
    fireEvent.change(input, { target: { value: 'x' } });
    expect(screen.getByRole('button', { name: '점수 등록' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(input, { target: { value: '<b>bad</b>' } });
    expect(screen.getByRole('button', { name: '점수 등록' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(input, { target: { value: '새싹' } });
    expect(screen.getByRole('button', { name: '점수 등록' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '점수 등록' }));
    await waitFor(() => expect(screen.getByText('새싹님의 3,200점 기록을 등록했어요!')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(storage.getItem('chicks-cannon:nickname:v1')).toBe('새싹');
    expect(storage.getItem('chicks-cannon:participant-id:v1')).toMatch(/-4[0-9a-f]{3}-/i);
  });

  it('reuses the saved identity and reports a retained higher score without duplicate posts', async () => {
    const storage = makeStorage();
    storage.setItem('chicks-cannon:participant-id:v1', '550e8400-e29b-41d4-a716-446655440000');
    storage.setItem('chicks-cannon:nickname:v1', '새싹');
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(JSON.parse(String(init?.body))).toMatchObject({
        participantId: '550e8400-e29b-41d4-a716-446655440000', nickname: '새싹', score: 100,
      });
      return response({
        participantId: '550e8400-e29b-41d4-a716-446655440000', nickname: '새싹', bestScore: 900,
        achievedAt: '2026-10-20T00:00:00.000Z', createdAt: '', updatedAt: '',
      });
    });
    render(<ScoreSubmissionPanel score={100} completed={true} client={new LeaderboardClient(fetcher)} storage={storage} />);
    const button = screen.getByRole('button', { name: '순위 등록' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('새싹님의 최고 기록 900점을 유지했어요.')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
