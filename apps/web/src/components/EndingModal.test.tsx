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
    const onClaimReward = vi.fn();
    render(<EndingModal
      score={4200}
      items={{ booster: 0, quake: 0, mega: 0, butter: 0, cushion: 0 }}
      finalRewardClaimed={false}
      onClaimReward={onClaimReward}
      client={new LeaderboardClient(fetcher)}
      storage={memoryStorage()}
      onPlayAgain={onPlayAgain}
      onOpenLeaderboard={onOpenLeaderboard}
    />);
    expect(screen.getByText('4,200')).toBeTruthy();
    const chooseReward = screen.getByRole('button', { name: '알 쿠션 보상 선택, 현재 0개' });
    fireEvent.click(chooseReward);
    expect(onClaimReward).toHaveBeenCalledWith('cushion');
    expect(screen.getByText('회사 계정 로그인을 설정하면 순위가 자동 등록됩니다.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '전체 순위' }));
    fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
    expect(fetcher).not.toHaveBeenCalled();
    expect(onOpenLeaderboard).toHaveBeenCalledOnce();
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });
});
