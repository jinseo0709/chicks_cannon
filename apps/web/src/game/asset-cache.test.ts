import { afterEach, describe, expect, it, vi } from 'vitest';
import { SvgAssetCache, stageAssetIds } from './asset-cache';
import { CHICK_FORMS, STAGE_ORDER } from './constants';

class MockImage {
  static instances: MockImage[] = [];
  complete = false;
  naturalWidth = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  constructor() {
    MockImage.instances.push(this);
  }
}

afterEach(() => {
  MockImage.instances = [];
  vi.unstubAllGlobals();
});

describe('SvgAssetCache', () => {
  it('tracks loaded and failed local assets without rejecting preload', async () => {
    vi.stubGlobal('Image', MockImage);
    const cache = new SvgAssetCache();
    const loading = cache.preload(['background-1', 'chick-1']);
    MockImage.instances[0].complete = true;
    MockImage.instances[0].naturalWidth = 1280;
    MockImage.instances[0].onload?.();
    MockImage.instances[1].onerror?.();
    await loading;
    expect(cache.get('background-1')).toBe(MockImage.instances[0]);
    expect(cache.get('chick-1')).toBeNull();
    expect(cache.getProgress()).toEqual({ loaded: 1, total: 2, failed: ['chick-1'] });
    cache.dispose();
  });

  it('preloads the chapter scene and all character/prop artwork', () => {
    expect(stageAssetIds(4)).toEqual([
      'background-2', 'chick-2', 'cat-normal', 'cat-shield', 'cat-boss', 'nest', 'slingshot', 'egg',
    ]);
  });

  it.each(STAGE_ORDER)('maps level %s to an existing character and background variant', (stage) => {
    const variant = CHICK_FORMS[stage].assetVariant;
    expect(stageAssetIds(stage).slice(0, 2)).toEqual([`background-${variant}`, `chick-${variant}`]);
    expect(variant).toBeGreaterThanOrEqual(1);
    expect(variant).toBeLessThanOrEqual(4);
  });
});
