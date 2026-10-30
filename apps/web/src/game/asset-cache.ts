import { CHICK_FORMS, REGIONS } from './constants';
import { assetUrl } from '../asset-url';
import type { GameStage } from './types';

export type AssetId =
  | `background-${1 | 2 | 3 | 4 | 5 | 6}`
  | `chick-${1 | 2 | 3 | 4}`
  | 'chick-1-blink'
  | 'cat-normal'
  | 'cat-shield'
  | 'cat-boss'
  | 'nest'
  | 'slingshot'
  | 'egg'
  | 'block-wood'
  | 'block-stone'
  | 'block-glass'
  | 'block-steel'
  | 'block-rubber'
  | 'block-tnt'
  | 'tire'
  | 'gear'
  | 'fan'
  | 'shutter'
  | 'chandelier';

const assetPaths: Record<AssetId, string> = {
  'background-1': '/assets/backgrounds/stage-1.png',
  'background-2': '/assets/backgrounds/stage-2.png',
  'background-3': '/assets/backgrounds/stage-3.png',
  'background-4': '/assets/backgrounds/stage-4.png',
  'background-5': '/assets/backgrounds/stage-5.png',
  'background-6': '/assets/backgrounds/stage-6.png',
  'chick-1': '/assets/chicks/stage-1.png',
  'chick-2': '/assets/chicks/stage-2.png',
  'chick-3': '/assets/chicks/stage-3.png',
  'chick-4': '/assets/chicks/stage-4.png',
  'chick-1-blink': '/assets/chicks/stage-1-blink.png',
  'cat-normal': '/assets/cats/normal.png',
  'cat-shield': '/assets/cats/shield.png',
  'cat-boss': '/assets/cats/boss.png',
  nest: '/assets/props/nest.png',
  slingshot: '/assets/props/slingshot.png',
  egg: '/assets/props/egg.svg',
  'block-wood': '/assets/props/wood.png',
  'block-stone': '/assets/props/stone.png',
  'block-glass': '/assets/props/glass.png',
  'block-steel': '/assets/props/steel.svg',
  'block-rubber': '/assets/props/rubber.svg',
  'block-tnt': '/assets/props/tnt.png',
  tire: '/assets/props/tire.png',
  gear: '/assets/props/gear.png',
  fan: '/assets/props/fan.png',
  shutter: '/assets/props/shutter.png',
  chandelier: '/assets/props/chandelier.png',
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
      image.src = assetUrl(assetPaths[id]);
      if (image.complete && image.naturalWidth > 0) resolve();
    }).finally(() => this.pending.delete(id));
    this.pending.set(id, promise);
    return promise;
  }
}

export const stageBackgroundAssetId = (stage: GameStage): AssetId =>
  `background-${REGIONS[Math.ceil(stage / 5) as 1 | 2 | 3 | 4].backgroundStage}`;

export const stageAssetIds = (stage: GameStage): readonly AssetId[] => [
  stageBackgroundAssetId(stage),
  `chick-${CHICK_FORMS[stage].assetVariant}`,
  'chick-1-blink',
  'cat-normal',
  'cat-shield',
  'cat-boss',
  'nest',
  'slingshot',
  'egg',
  'block-wood',
  'block-stone',
  'block-glass',
  'block-steel',
  'block-rubber',
  'block-tnt',
  'tire',
  'gear',
  'fan',
  'shutter',
  'chandelier',
];
