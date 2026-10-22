import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EndingModal } from './EndingModal';
import { LeaderboardClient } from '../leaderboard/client';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value),
  } as Storage;
}

describe('EndingModal', () => {
  it('offers completed score submission, replay and full standings navigation', () => {
    const fetcher = vi.fn<typeof fetch>();
    const onPlayAgain = vi.fn();
    const onOpenLeaderboard = vi.fn();
    render(<EndingModal
      score={4200}
      client={new LeaderboardClient(fetcher)}
      storage={memoryStorage()}
      onPlayAgain={onPlayAgain}
      onOpenLeaderboard={onOpenLeaderboard}
    />);
    expect(screen.getByText('4,200')).toBeTruthy();
    expect(screen.getByRole('button', { name: '순위 등록' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '전체 순위' }));
    fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
    expect(fetcher).not.toHaveBeenCalled();
    expect(onOpenLeaderboard).toHaveBeenCalledOnce();
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });
});
