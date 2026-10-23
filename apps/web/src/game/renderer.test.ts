import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SvgAssetCache } from './asset-cache';
import { GameCanvasRenderer } from './renderer';
import { BLOCK_CONFIG, CHICK_FORMS, WORLD } from './constants';
import { STAGES } from './stages';
import type { GameSnapshot } from './types';

const gradient = { addColorStop: vi.fn() };
const context = {
  save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
  translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), createLinearGradient: vi.fn(() => gradient),
  createRadialGradient: vi.fn(() => gradient),
  beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(), bezierCurveTo: vi.fn(), rect: vi.fn(), clip: vi.fn(), closePath: vi.fn(), arc: vi.fn(), setLineDash: vi.fn(), rotate: vi.fn(), strokeRect: vi.fn(),
  fillText: vi.fn(), roundRect: vi.fn(),
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', shadowColor: '', shadowBlur: 0,
  globalAlpha: 1,
  font: '', textAlign: 'start', textBaseline: 'alphabetic',
} as unknown as CanvasRenderingContext2D;

const snapshot: GameSnapshot = {
  screen: 'game', stage: 1, score: 0, stageScore: 0, scoreTarget: 3600, stageAmmo: 6, stageStars: 0,
  ammo: 3, campaignComplete: false,
  state: 'AIMING', items: { booster: 0, quake: 0, mega: 0, butter: 0, cushion: 0 }, eggCushionActive: false, finalRewardClaimed: false, muted: false,
  targetingItem: null, slickZones: [],
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

  it('draws the loaded chick at the cannon while aiming', () => {
    const image = document.createElement('img');
    const assets = new SvgAssetCache();
    vi.spyOn(assets, 'get').mockReturnValue(image);
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, assets);
    renderer.resize(1280, 720, 1);
    renderer.render(snapshot, 100);
    const radius = snapshot.form.radius;
    expect(context.drawImage).toHaveBeenCalledWith(
      image,
      -radius * 1.6,
      -radius * 1.6,
      radius * 3.2,
      radius * 3.2,
    );
    renderer.dispose();
  });

  it('uses the authored blink face for the baby chick', () => {
    const image = document.createElement('img');
    const assets = new SvgAssetCache();
    const getAsset = vi.spyOn(assets, 'get').mockReturnValue(image);
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, assets);
    renderer.resize(1280, 720, 1);
    renderer.render(snapshot, 3800);
    expect(getAsset).toHaveBeenCalledWith('chick-1-blink');
    renderer.dispose();
  });

  it('renders material texture and contact shadows for stage objects', () => {
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, new SvgAssetCache());
    renderer.resize(1280, 720, 1);
    renderer.render({
      ...snapshot,
      entities: [
        { id: 1, kind: 'block', x: 400, y: 600, width: 48, height: 80, angle: 0, material: 'wood', alive: true },
        { id: 2, kind: 'block', x: 460, y: 600, width: 48, height: 80, angle: 0, material: 'stone', alive: true },
      ],
    }, 100);
    expect(context.ellipse).toHaveBeenCalled();
    expect(context.bezierCurveTo).toHaveBeenCalled();
    expect(context.createRadialGradient).toHaveBeenCalled();
    const woodBounds = vi.mocked(context.roundRect).mock.calls[0];
    expect(woodBounds[2]).toBeGreaterThan(48);
    expect(woodBounds[3]).toBeGreaterThan(80);
    expect(BLOCK_CONFIG.wood).toMatchObject({ hp: 32, density: 0.003 });
    expect(BLOCK_CONFIG.stone).toMatchObject({ hp: 75, density: 0.007 });
    expect(BLOCK_CONFIG.glass).toMatchObject({ hp: 12, density: 0.0018 });
    expect(BLOCK_CONFIG.steel).toMatchObject({ hp: 150, density: 0.012, restitution: 0.08 });
    expect(BLOCK_CONFIG.rubber).toMatchObject({ hp: 28, density: 0.0024, restitution: 0.78 });
    expect(BLOCK_CONFIG.tnt).toMatchObject({ hp: 18, density: 0.0018 });
    renderer.dispose();
  });

  it.each(['wood', 'glass', 'stone', 'steel', 'rubber'] as const)('draws deterministic progressive damage for %s blocks only below full health', (material) => {
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, new SvgAssetCache());
    renderer.resize(1280, 720, 1);
    const lineCount = (hp: number) => {
      vi.clearAllMocks();
      renderer.render({
        ...snapshot,
        entities: [{ id: 37, kind: 'block', x: 500, y: 400, width: 80, height: 60, angle: 0.2, material, hp, maxHp: 100, alive: true }],
      }, 100);
      return vi.mocked(context.lineTo).mock.calls.length;
    };
    const pristine = lineCount(100);
    const damaged = lineCount(60);
    const heavilyDamaged = lineCount(20);
    expect(damaged).toBeGreaterThan(pristine);
    expect(heavilyDamaged).toBeGreaterThan(damaged);
    expect(vi.mocked(context.clip)).toHaveBeenCalled();
    renderer.dispose();
  });

  it('draws the nest on the far right and connects the moving shutter to a ceiling pulley', () => {
    const image = document.createElement('img');
    const assets = new SvgAssetCache();
    vi.spyOn(assets, 'get').mockImplementation((id) => id === 'nest' ? image : null);
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, assets);
    renderer.resize(1280, 720, 1);
    renderer.render({
      ...snapshot,
      stage: 2,
      entities: [{ id: 9, kind: 'shutter', x: 620, y: 435, width: 24, height: 150, angle: 0, alive: true }],
    }, 100);
    expect(WORLD.nest).toEqual({ x: 1205, y: 620 });
    expect(context.drawImage).toHaveBeenCalledWith(image, 1140, 580, 130, 80);
    expect(context.arc).toHaveBeenCalledWith(620, 200, 9, 0, Math.PI * 2);
    expect(context.lineTo).toHaveBeenCalledWith(620, 360);
    renderer.dispose();
  });

  it('shows a local butter patch and a highlight without changing block dimensions', () => {
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, new SvgAssetCache());
    renderer.resize(1280, 720, 1);
    renderer.render({
      ...snapshot,
      slickZones: [{ id: 1, x: 900, width: 180 }],
      entities: [{ id: 20, kind: 'block', x: 850, y: 620, width: 24, height: 100, angle: 0, material: 'wood', alive: true, slick: true }],
    }, 100);
    expect(context.ellipse).toHaveBeenCalledWith(900, 669, 90, 5, 0, 0, Math.PI * 2);
    expect(context.strokeRect).toHaveBeenCalledWith(-12, -50, 24, 100);
    renderer.dispose();
  });

  it('keeps chapters 1 to 5 static while chapter 6 particles are deterministic', () => {
    const canvas = document.createElement('canvas');
    const renderer = new GameCanvasRenderer(canvas, new SvgAssetCache());
    renderer.resize(1280, 720, 1);
    const emptySnapshot = { ...snapshot, state: 'PAUSED' as const, ammo: 0 };
    const firstStops = { 1: '#a0d8ef', 2: '#a0d8ef', 3: '#ff7e5f', 4: '#2b1055', 5: '#2b1055' } as const;
    for (const stage of [1, 2, 3, 4, 5] as const) {
      vi.clearAllMocks();
      renderer.render({ ...emptySnapshot, stage }, 200);
      expect(vi.mocked(gradient.addColorStop).mock.calls.flat().join(' ')).toContain(firstStops[stage]);
      const fixedArcs = [...vi.mocked(context.arc).mock.calls];
      const fixedTransforms = [...vi.mocked(context.translate).mock.calls];
      vi.clearAllMocks();
      renderer.render({ ...emptySnapshot, stage }, 6200);
      expect(vi.mocked(context.arc).mock.calls).toEqual(fixedArcs);
      expect(vi.mocked(context.translate).mock.calls).toEqual(fixedTransforms);
    }

    vi.clearAllMocks();
    renderer.render({ ...emptySnapshot, stage: 6 }, 200);
    const festivalAtStart = [...vi.mocked(context.translate).mock.calls];
    vi.clearAllMocks();
    renderer.render({ ...emptySnapshot, stage: 6 }, 200);
    expect(vi.mocked(context.translate).mock.calls).toEqual(festivalAtStart);
    vi.clearAllMocks();
    renderer.render({ ...emptySnapshot, stage: 6 }, 6200);
    expect(vi.mocked(context.translate).mock.calls).not.toEqual(festivalAtStart);

    expect(vi.mocked(gradient.addColorStop).mock.calls.flat().join(' ')).toContain('#f6d365');
    renderer.dispose();
  });
});
