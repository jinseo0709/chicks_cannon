import { describe, expect, it } from 'vitest';
import {
  decodeCampaignProgress,
  loadCampaignProgress,
  recordStageResult,
  saveCampaignProgress,
  WORLD_PROGRESS_KEY,
} from './progress';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, String(value)),
  } as Storage;
}

describe('campaign progress storage', () => {
  it('returns empty progress for fresh, malformed, and non-object data', () => {
    const empty = { version: 2, completedStages: [], bestStars: {} };
    expect(decodeCampaignProgress(null)).toEqual(empty);
    expect(decodeCampaignProgress('{broken')).toEqual(empty);
    expect(decodeCampaignProgress('42')).toEqual(empty);
  });

  it('migrates legacy completion arrays without inventing stars', () => {
    const storage = memoryStorage();
    storage.setItem(WORLD_PROGRESS_KEY, '[3,1,3,0,7]');
    expect(loadCampaignProgress(storage)).toEqual({ version: 2, completedStages: [1, 3], bestStars: {} });
    expect(JSON.parse(storage.getItem(WORLD_PROGRESS_KEY)!)).toEqual({ version: 2, completedStages: [1, 3], bestStars: {} });
  });

  it('validates stages and star ratings and retains only unique valid values', () => {
    expect(decodeCampaignProgress(JSON.stringify({
      completedStages: [6, 2, 2, 0, 9, '3'],
      bestStars: { 1: 0, 2: 2, 3: 4, 4: '3', 5: 1, 7: 3 },
    }))).toEqual({ version: 2, completedStages: [2, 6], bestStars: { 2: 2, 5: 1 } });
  });

  it('persists and reloads records, only replacing a stage rating with a higher one', () => {
    const storage = memoryStorage();
    const first = recordStageResult({ version: 2, completedStages: [], bestStars: {} }, 2, 2);
    saveCampaignProgress(first, storage);
    const restored = loadCampaignProgress(storage);
    expect(restored).toEqual(first);
    expect(recordStageResult(restored, 2, 1)).toBe(restored);
    const improved = recordStageResult(restored, 2, 3);
    expect(improved).toEqual({ version: 2, completedStages: [2], bestStars: { 2: 3 } });
  });

  it('keeps progress usable when browser storage writes throw', () => {
    const storage = { setItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    expect(() => saveCampaignProgress({ version: 2, completedStages: [1], bestStars: { 1: 1 } }, storage)).not.toThrow();
  });
});
