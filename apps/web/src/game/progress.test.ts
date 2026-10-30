import { describe, expect, it } from 'vitest';
import {
  clearSavedCampaignProgress,
  createEmptyCampaignProgress,
  getUnlockedStage,
  loadCampaignProgress,
  recordStageResult,
  saveCampaignProgress,
  WORLD_PROGRESS_KEY,
} from './progress';
import { STAGE_ORDER } from './constants';
import type { CampaignProgress } from './progress';

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

describe('campaign progress persistence', () => {
  it('starts empty and explicitly clears saved progress', () => {
    const storage = memoryStorage();
    storage.setItem(WORLD_PROGRESS_KEY, JSON.stringify({ version: 4, completedStages: [1], bestStars: { 1: 3 }, challengeBadges: [] }));
    clearSavedCampaignProgress(storage);
    expect(createEmptyCampaignProgress()).toEqual({ version: 4, completedStages: [], bestStars: {}, challengeBadges: [] });
    expect(storage.getItem(WORLD_PROGRESS_KEY)).toBeNull();
  });

  it('round-trips saved 20-stage completion, stars, and badges', () => {
    const storage = memoryStorage();
    const progress: CampaignProgress = {
      version: 4,
      completedStages: [1, 2, 20],
      bestStars: { 1: 2, 2: 3, 20: 1 },
      challengeBadges: [2, 20],
    };
    saveCampaignProgress(storage, progress);
    expect(loadCampaignProgress(storage)).toEqual(progress);
  });

  it('migrates version-3 campaign records and preserves valid first-six results', () => {
    const storage = memoryStorage();
    storage.setItem(WORLD_PROGRESS_KEY, JSON.stringify({
      version: 3, completedStages: [1, 3, 6], bestStars: { 1: 3, 3: 2, 6: 1 }, challengeBadges: [3],
    }));
    expect(loadCampaignProgress(storage)).toEqual({
      version: 4, completedStages: [1, 3, 6], bestStars: { 1: 3, 3: 2, 6: 1 }, challengeBadges: [3],
    });
  });

  it.each([
    ['missing record', null],
    ['malformed JSON', '{bad json'],
    ['unsupported version', JSON.stringify({ version: 2, completedStages: [1], bestStars: { 1: 3 }, challengeBadges: [] })],
    ['invalid schema', JSON.stringify({ version: 4, completedStages: '1', bestStars: {}, challengeBadges: [] })],
  ])('returns an empty record for %s', (_label, value) => {
    const storage = memoryStorage();
    if (value !== null) storage.setItem(WORLD_PROGRESS_KEY, value);
    expect(loadCampaignProgress(storage)).toEqual(createEmptyCampaignProgress());
  });

  it('filters invalid and duplicate IDs, invalid stars, and badges for incomplete stages', () => {
    const storage = memoryStorage();
    storage.setItem(WORLD_PROGRESS_KEY, JSON.stringify({
      version: 4,
      completedStages: [20, 2, 2, 0, 21, 3.5, '4'],
      bestStars: { 2: 3, 20: 9, 3: 2, 21: 3, 4: 1 },
      challengeBadges: [20, 2, 2, 3, 21],
    }));
    expect(loadCampaignProgress(storage)).toEqual({
      version: 4, completedStages: [2, 20], bestStars: { 2: 3 }, challengeBadges: [2, 20],
    });
  });

  it('keeps the best stage result and preserves an earned badge on replay', () => {
    const first = recordStageResult(createEmptyCampaignProgress(), 2, 2);
    expect(recordStageResult(first, 2, 1)).toBe(first);
    const badge = recordStageResult(first, 2, 1, true);
    expect(badge).toEqual({ version: 4, completedStages: [2], bestStars: { 2: 2 }, challengeBadges: [2] });
    expect(recordStageResult(badge, 2, 1)).toBe(badge);
    expect(recordStageResult(badge, 2, 3).bestStars[2]).toBe(3);
  });

  it('unlocks the first incomplete stage and leaves stage 20 replayable after completion', () => {
    const empty = createEmptyCampaignProgress();
    expect(getUnlockedStage(empty)).toBe(1);
    expect(getUnlockedStage({ ...empty, completedStages: [1, 2, 3, 4, 5] })).toBe(6);
    expect(getUnlockedStage({ ...empty, completedStages: STAGE_ORDER.slice(0, 19) as (typeof empty)['completedStages'] })).toBe(20);
    expect(getUnlockedStage({ ...empty, completedStages: [...STAGE_ORDER] })).toBe(20);
  });

  it('falls back safely when browser storage reads, writes, or removal throw', () => {
    const storage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    } as unknown as Storage;
    expect(loadCampaignProgress(storage)).toEqual(createEmptyCampaignProgress());
    expect(() => saveCampaignProgress(storage, createEmptyCampaignProgress())).not.toThrow();
    expect(() => clearSavedCampaignProgress(storage)).not.toThrow();
  });
});
