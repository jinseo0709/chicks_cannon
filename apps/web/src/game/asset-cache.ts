import { CHICK_FORMS } from './constants';
import type { GameStage } from './types';

export type AssetId =
  | `background-${1 | 2 | 3 | 4}`
  | `chick-${1 | 2 | 3 | 4}`
  | 'cat-normal'
  | 'cat-shield'
  | 'cat-boss'
  | 'nest'
  | 'slingshot'
  | 'egg';

const assetPaths: Record<AssetId, string> = {
  'background-1': '/assets/backgrounds/chapter-1.svg',
  'background-2': '/assets/backgrounds/chapter-2.svg',
  'background-3': '/assets/backgrounds/chapter-3.svg',
  'background-4': '/assets/backgrounds/chapter-4.svg',
  'chick-1': '/assets/chicks/stage-1.svg',
  'chick-2': '/assets/chicks/stage-2.svg',
  'chick-3': '/assets/chicks/stage-3.svg',
  'chick-4': '/assets/chicks/stage-4.svg',
  'cat-normal': '/assets/cats/normal.svg',
  'cat-shield': '/assets/cats/shield.svg',
  'cat-boss': '/assets/cats/boss.svg',
  nest: '/assets/props/nest.svg',
  slingshot: '/assets/props/slingshot.svg',
  egg: '/assets/props/egg.svg',
};

export class SvgAssetCache {
  private readonly images = new Map<AssetId, HTMLImageElement>();
  private readonly failed = new Set<AssetId>();
  private readonly pending = new Map<AssetId, Promise<void>>();
  private disposed = false;

  preload(ids: readonly AssetId[]): Promise<void> {
    return Promise.all(ids.map((id) => this.load(id))).then(() => undefined);
  }

  get(id: AssetId): HTMLImageElement | null {
    const image = this.images.get(id);
    return image?.complete && image.naturalWidth > 0 ? image : null;
  }

  getProgress(): { loaded: number; total: number; failed: readonly AssetId[] } {
    const loaded = [...this.images].filter(([, image]) => image.complete && image.naturalWidth > 0).length;
    return { loaded, total: this.images.size + this.failed.size, failed: [...this.failed] };
  }

  dispose(): void {
    this.disposed = true;
    for (const image of this.images.values()) {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    }
    this.images.clear();
    this.pending.clear();
    this.failed.clear();
  }

  private load(id: AssetId): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.pending.has(id)) return this.pending.get(id)!;
    const promise = new Promise<void>((resolve) => {
      const image = new Image();
      this.images.set(id, image);
      image.onload = () => {
        this.failed.delete(id);
        resolve();
      };
      image.onerror = () => {
        this.images.delete(id);
        this.failed.add(id);
        resolve();
      };
      image.src = assetPaths[id];
      if (image.complete && image.naturalWidth > 0) resolve();
    }).finally(() => this.pending.delete(id));
    this.pending.set(id, promise);
    return promise;
  }
}

export const stageAssetIds = (stage: GameStage): readonly AssetId[] => [
  `background-${CHICK_FORMS[stage].assetVariant}`,
  `chick-${CHICK_FORMS[stage].assetVariant}`,
  'cat-normal',
  'cat-shield',
  'cat-boss',
  'nest',
  'slingshot',
  'egg',
];
