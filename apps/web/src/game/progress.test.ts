import { describe, expect, it } from 'vitest';
import {
  clearSavedCampaignProgress,
  createEmptyCampaignProgress,
  recordStageResult,
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

describe('session campaign progress', () => {
  it('starts empty and clears progress saved by earlier versions', () => {
    const empty = { version: 2, completedStages: [], bestStars: {} };
    const storage = memoryStorage();
    storage.setItem(WORLD_PROGRESS_KEY, JSON.stringify({ completedStages: [1, 2], bestStars: { 1: 3, 2: 2 } }));
    clearSavedCampaignProgress(storage);
    expect(createEmptyCampaignProgress()).toEqual(empty);
    expect(storage.getItem(WORLD_PROGRESS_KEY)).toBeNull();
  });

  it('keeps the best stage result during a session without saving it', () => {
    const first = recordStageResult(createEmptyCampaignProgress(), 2, 2);
    expect(recordStageResult(first, 2, 1)).toBe(first);
    const improved = recordStageResult(first, 2, 3);
    expect(improved).toEqual({ version: 2, completedStages: [2], bestStars: { 2: 3 } });
  });

  it('keeps working when browser storage removal throws', () => {
    const storage = { removeItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    expect(() => clearSavedCampaignProgress(storage)).not.toThrow();
  });
});
