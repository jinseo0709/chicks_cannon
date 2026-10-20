import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SvgAssetCache } from './asset-cache';
import { GameCanvasRenderer } from './renderer';
import { CHICK_FORMS } from './constants';
import { STAGES } from './stages';
import type { GameSnapshot } from './types';

const gradient = { addColorStop: vi.fn() };
const context = {
  save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
  translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), createLinearGradient: vi.fn(() => gradient),
  beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(), arc: vi.fn(), setLineDash: vi.fn(), rotate: vi.fn(), strokeRect: vi.fn(),
  fillText: vi.fn(), roundRect: vi.fn(),
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', shadowColor: '', shadowBlur: 0,
  font: '', textAlign: 'start', textBaseline: 'alphabetic',
} as unknown as CanvasRenderingContext2D;

const snapshot: GameSnapshot = {
  screen: 'game', stage: 1, score: 0, ammo: 3, campaignComplete: false,
  state: 'AIMING', items: { booster: 1, quake: 1, mega: 1 }, muted: false,
  entities: [], aimPosition: null,
  defeatCause: null, story: STAGES[1].story, form: CHICK_FORMS[1], evolvedForm: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});

describe('GameCanvasRenderer', () => {
  it('scales the backing canvas for DPR and letterboxes the 1280 by 720 scene', () => {
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, new SvgAssetCache());
    renderer.resize(640, 400, 2);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(800);
    renderer.render(snapshot, 100);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.translate).toHaveBeenCalledWith(0, 20);
    expect(context.scale).toHaveBeenCalledWith(0.5, 0.5);
    renderer.dispose();
  });

  it('keeps a Canvas fallback path when local SVG images are unavailable', () => {
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, new SvgAssetCache());
    renderer.resize(1280, 720, 1);
    expect(() => renderer.render(snapshot, 500)).not.toThrow();
    expect(context.createLinearGradient).toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalled();
    renderer.dispose();
    renderer.render(snapshot, 520);
    expect(context.clearRect).toHaveBeenCalledTimes(1);
  });
});
