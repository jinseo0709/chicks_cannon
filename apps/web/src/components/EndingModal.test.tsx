import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EndingModal } from './EndingModal';
import { LocalLeaderboardClient } from '../leaderboard/local-client';

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
  it('registers the local score and offers replay and full standings navigation', async () => {
    const storage = memoryStorage();
    storage.setItem('chicks-cannon:nickname:v1', '새싹');
    const client = new LocalLeaderboardClient(storage);
    const onPlayAgain = vi.fn();
    const onOpenLeaderboard = vi.fn();
    const onClaimReward = vi.fn();
    render(<EndingModal
      score={4200}
      items={{ booster: 0, quake: 0, mega: 0, butter: 0, cushion: 0 }}
      finalRewardClaimed={false}
      onClaimReward={onClaimReward}
      client={client}
      storage={storage}
      onPlayAgain={onPlayAgain}
      onOpenLeaderboard={onOpenLeaderboard}
    />);
    expect(screen.getByText('4,200')).toBeTruthy();
    const chooseReward = screen.getByRole('button', { name: '알 쿠션 보상 선택, 현재 0개' });
    fireEvent.click(chooseReward);
    expect(onClaimReward).toHaveBeenCalledWith('cushion');
    await waitFor(() => expect(screen.getByText('새싹님의 4,200점 기록을 순위표에 등록했어요!')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '전체 순위' }));
    fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
    expect(await client.list(1)).toMatchObject({ totalCount: 1, items: [{ nickname: '새싹', bestScore: 4200 }] });
    expect(onOpenLeaderboard).toHaveBeenCalledOnce();
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });
});
