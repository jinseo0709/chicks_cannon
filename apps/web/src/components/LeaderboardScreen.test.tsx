import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeaderboardClient } from '../leaderboard/client';
import { LeaderboardScreen } from './LeaderboardScreen';

function page(items: Array<{ participantId: string; nickname: string; bestScore: number; achievedAt: string; rank: number }>, current: number, totalPages: number) {
  return { items, page: current, pageSize: 25, totalCount: 30, totalPages };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('LeaderboardScreen', () => {
  it('loads pages, keeps same nicknames as separate participants, and changes page', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input));
      const current = Number(url.searchParams.get('page'));
      return response(page(current === 1 ? [
        { participantId: 'one', nickname: '새싹', bestScore: 900, achievedAt: '2026-10-20T00:00:00.000Z', rank: 1 },
        { participantId: 'two', nickname: '새싹', bestScore: 850, achievedAt: '2026-10-19T00:00:00.000Z', rank: 2 },
      ] : [
        { participantId: 'three', nickname: '두리', bestScore: 700, achievedAt: '2026-10-18T00:00:00.000Z', rank: 3 },
      ], current, 2));
    });
    const onBack = vi.fn();
    render(<LeaderboardScreen client={new LeaderboardClient(fetcher)} onBack={onBack} />);
    expect(await screen.findAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('rowheader', { name: '새싹' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByRole('rowheader', { name: '두리' })).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: '← 돌아가기' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows empty results and retries a failed request', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(page([], 1, 0)))
      .mockResolvedValueOnce(response({ error: { code: 'UNAVAILABLE', message: '잠시 후 다시 시도해 주세요.' } }, 503))
      .mockResolvedValueOnce(response(page([], 1, 0)));
    const client = new LeaderboardClient(fetcher);
    const { rerender } = render(<LeaderboardScreen client={client} onBack={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: '아직 등록된 기록이 없어요' })).toBeTruthy();
    rerender(<LeaderboardScreen client={client} onBack={vi.fn()} pageSize={10} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '아직 등록된 기록이 없어요' })).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
