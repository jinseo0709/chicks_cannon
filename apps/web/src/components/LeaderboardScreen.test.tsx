import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalLeaderboardClient } from '../leaderboard/local-client';
import { LeaderboardScreen } from './LeaderboardScreen';
import type { LeaderboardRepository } from '../leaderboard/types';

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

describe('LeaderboardScreen', () => {
  it('shows persisted local records, separates players, and changes page', async () => {
    const storage = makeStorage();
    const client = new LocalLeaderboardClient(storage, () => new Date('2026-10-20T12:00:00.000Z'));
    await client.submit({ participantId: 'one', nickname: '새싹', score: 900, campaignCompleted: true });
    await client.submit({ participantId: 'two', nickname: '새싹', score: 850, campaignCompleted: true });
    await client.submit({ participantId: 'three', nickname: '두리', score: 700, campaignCompleted: true });
    const onBack = vi.fn();
    render(<LeaderboardScreen client={client} onBack={onBack} pageSize={2} />);

    expect(await screen.findAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('rowheader', { name: '새싹' })).toHaveLength(2);
    expect(screen.getByText('이 브라우저에 저장된 기록이에요.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByRole('rowheader', { name: '두리' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '← 돌아가기' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows empty results', async () => {
    const client: LeaderboardRepository = {
      list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 }),
      submit: vi.fn(),
    };
    render(<LeaderboardScreen client={client} onBack={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: '아직 등록된 기록이 없어요' })).toBeTruthy();
  });

  it('shows a retry option after a failed local read', async () => {
    const client: LeaderboardRepository = {
      list: vi.fn().mockRejectedValueOnce(new Error('로컬 기록을 읽지 못했습니다.'))
        .mockResolvedValueOnce({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 }),
      submit: vi.fn(),
    };
    render(<LeaderboardScreen client={client} onBack={vi.fn()} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '아직 등록된 기록이 없어요' })).toBeTruthy());
    expect(client.list).toHaveBeenCalledTimes(2);
  });
});
