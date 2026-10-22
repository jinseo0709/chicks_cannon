import { afterEach, describe, expect, it, vi } from 'vitest';
import { Body, Composite } from 'matter-js';
import { ChickCannonEngine } from './engine';

type ButterBody = Matter.Body & { customData?: { slick?: boolean; hp?: number } };
interface ButterHarness { engine: Matter.Engine; bodies: Map<number, ButterBody>; state: string; }
const games: ChickCannonEngine[] = [];
afterEach(() => games.splice(0).forEach((game) => game.dispose()));

function setup() {
  const onSnapshot = vi.fn();
  const game = new ChickCannonEngine(onSnapshot);
  games.push(game);
  const harness = game as unknown as ButterHarness;
  return { game, harness, onSnapshot };
}

describe('targeted butter spray', () => {
  it('rejects every item outside active play without publishing or consuming stock', () => {
    const { game, onSnapshot } = setup();
    const count = onSnapshot.mock.calls.length;
    for (const kind of ['booster', 'quake', 'mega', 'butter'] as const) expect(game.useItem(kind)).toBe(false);
    expect(onSnapshot).toHaveBeenCalledTimes(count);
    expect(game.getSnapshot().items).toEqual({ booster: 1, quake: 1, mega: 1, butter: 1 });
  });

  it('selects and cancels without consuming a use or firing an existing aim', () => {
    const { game } = setup();
    game.dismissDialogue();
    game.setAim({ x: 60, y: 540 });
    expect(game.useItem('butter')).toBe(true);
    expect(game.getSnapshot()).toMatchObject({ targetingItem: 'butter', aimPosition: null, ammo: 4 });
    game.releaseAim();
    expect(game.getSnapshot().entities.some((entity) => entity.kind === 'chick')).toBe(false);
    expect(game.useItem('butter')).toBe(true);
    expect(game.getSnapshot().targetingItem).toBeNull();
    expect(game.getSnapshot().items.butter).toBe(1);
    game.useItem('butter');
    game.pause();
    expect(game.getSnapshot()).toMatchObject({ state: 'PAUSED', targetingItem: null });
    expect(game.applyTargetedItem({ x: 850, y: 620 })).toBe(false);
    game.resume();
    game.useItem('butter');
    game.cancelTargetedItem();
    expect(game.getSnapshot().targetingItem).toBeNull();
    expect(game.getSnapshot().items.butter).toBe(1);
  });

  it('does not consume the item for empty, non-finite, letterbox or cat targets', () => {
    const { game } = setup();
    game.dismissDialogue();
    game.useItem('butter');
    for (const point of [{ x: 400, y: 100 }, { x: -1, y: 700 }, { x: 1400, y: 700 }, { x: 800, y: NaN }, { x: 1050, y: 540 }]) {
      expect(game.applyTargetedItem(point)).toBe(false);
      expect(game.getSnapshot()).toMatchObject({ targetingItem: 'butter', items: { butter: 1 } });
    }
  });

  it('uses rotated body geometry, zeroes only the chosen block friction and applies one small nudge', () => {
    const { game, harness } = setup();
    const target = [...harness.bodies.values()].find((body) => body.position.x === 785)!;
    const neighbor = [...harness.bodies.values()].find((body) => body.position.x === 925)!;
    Body.setAngle(target, Math.PI / 4);
    game.dismissDialogue();
    game.useItem('butter');
    expect(game.applyTargetedItem({ x: target.bounds.min.x + 1, y: target.bounds.min.y + 1 })).toBe(false);
    expect(game.applyTargetedItem({ ...target.position })).toBe(true);
    expect(target.friction).toBe(0);
    expect(target.frictionStatic).toBe(0);
    expect(target.customData).toMatchObject({ slick: true, hp: 32 });
    expect(target.force.x).toBeCloseTo(target.mass * 0.0008);
    expect(target.torque).not.toBe(0);
    expect(neighbor.friction).toBe(0.6);
    expect(game.getSnapshot()).toMatchObject({ targetingItem: null, items: { butter: 0 } });
    expect(game.getSnapshot().entities.find((entity) => entity.id === target.id)?.slick).toBe(true);
    expect(game.applyTargetedItem({ ...target.position })).toBe(false);
    expect(game.useItem('butter')).toBe(false);
    expect(target.force.x).toBeCloseTo(target.mass * 0.0008);
  });

  it.each([{ x: 0, center: 90 }, { x: 900, center: 900 }, { x: 1280, center: 1190 }])('creates only a local 180px ground patch at x=$x', ({ x, center }) => {
    const { game, harness } = setup();
    const originalGround = Composite.allBodies(harness.engine.world).find((body) => body.label === 'ground')!;
    game.dismissDialogue();
    game.useItem('butter');
    expect(game.applyTargetedItem({ x, y: 700 })).toBe(true);
    const grounds = Composite.allBodies(harness.engine.world).filter((body) => body.label === 'ground');
    expect(grounds).toHaveLength(3);
    const patch = grounds.find((body) => Math.round(body.bounds.max.x - body.bounds.min.x) === 180)!;
    expect(patch.bounds.min.x).toBe(center - 90);
    expect(patch.bounds.max.x).toBe(center + 90);
    expect(patch.frictionStatic).toBe(0);
    expect(grounds.every((body) => body.bounds.min.y === 670 && body.bounds.max.y === 720)).toBe(true);
    expect(grounds.filter((body) => body !== patch).every((body) => body.friction === originalGround.friction && body.frictionStatic === originalGround.frictionStatic)).toBe(true);
    expect(game.getSnapshot().slickZones).toEqual([{ id: 1, x: center, width: 180 }]);
    if (x === 900) {
      const base = [...harness.bodies.values()].find((body) => body.position.x === 925)!;
      expect(base.force.x).toBeGreaterThan(0);
      expect(base.friction).toBe(0.6);
    }
  });

  it('restores physical friction on retry without refunding the campaign use', () => {
    const { game, harness } = setup();
    game.dismissDialogue();
    game.useItem('butter');
    game.applyTargetedItem({ x: 785, y: 620 });
    game.retryStage();
    const originalBlock = [...harness.bodies.values()].find((body) => body.position.x === 785)!;
    expect(originalBlock.friction).toBe(0.6);
    expect(originalBlock.customData?.slick).toBeUndefined();
    expect(game.getSnapshot()).toMatchObject({ targetingItem: null, slickZones: [], items: { butter: 0 } });
    game.startCampaign();
    game.dismissDialogue();
    game.useItem('butter');
    game.applyTargetedItem({ x: 900, y: 700 });
    game.retryStage();
    expect(Composite.allBodies(harness.engine.world).filter((body) => body.label === 'ground')).toHaveLength(1);
    expect(game.getSnapshot().slickZones).toHaveLength(0);
    expect(game.getSnapshot().items.butter).toBe(0);
    game.startCampaign();
    expect(game.getSnapshot().items.butter).toBe(1);
  });

  it('keeps flying target taps from activating a skill and cancels targeting on another valid item', () => {
    const { game } = setup();
    game.dismissDialogue();
    game.setAim({ x: 35, y: 525 });
    game.releaseAim();
    game.useItem('butter');
    game.activateSkill();
    expect(game.getSnapshot().entities.filter((entity) => entity.kind === 'chick')).toHaveLength(1);
    game.useItem('quake');
    expect(game.getSnapshot()).toMatchObject({ targetingItem: null, items: { butter: 1, quake: 0 } });
  });
});
