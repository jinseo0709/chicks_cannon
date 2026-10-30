import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScoreSubmissionPanel } from './ScoreSubmissionPanel';
import { LocalLeaderboardClient } from '../leaderboard/local-client';
import { getOrCreateParticipant } from '../leaderboard/identity';

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

describe('ScoreSubmissionPanel', () => {
  afterEach(cleanup);

  it('automatically registers the completed score in the local leaderboard', async () => {
    const storage = makeStorage();
    storage.setItem('chicks-cannon:nickname:v1', '새싹');
    const client = new LocalLeaderboardClient(storage, () => new Date('2026-10-20T12:00:00.000Z'));
    const { rerender } = render(<ScoreSubmissionPanel score={3200} completed={false} client={client} storage={storage} />);
    expect(await client.list(1)).toMatchObject({ totalCount: 0 });

    rerender(<ScoreSubmissionPanel score={3200} completed={true} client={client} storage={storage} />);
    await waitFor(() => expect(screen.getByText('새싹님의 3,200점 기록을 순위표에 등록했어요!')).toBeTruthy());
    expect(await client.list(1)).toMatchObject({
      totalCount: 1,
      items: [{ nickname: '새싹', bestScore: 3200, rank: 1 }],
    });
  });

  it('keeps the best score when a local player submits a lower result', async () => {
    const storage = makeStorage();
    storage.setItem('chicks-cannon:nickname:v1', '병아리 모험가');
    const participantId = getOrCreateParticipant(storage);
    const client = new LocalLeaderboardClient(storage, () => new Date('2026-10-20T12:00:00.000Z'));
    await client.submit({ participantId, nickname: '병아리 모험가', score: 900, campaignCompleted: true });
    render(<ScoreSubmissionPanel score={100} completed={true} client={client} storage={storage} />);
    await waitFor(() => expect(screen.getByText('병아리 모험가님의 최고 기록 900점을 유지했어요!')).toBeTruthy());
    expect((await client.list(1)).items[0]?.bestScore).toBe(900);
  });
});
