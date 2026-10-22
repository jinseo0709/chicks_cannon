import { afterEach, describe, expect, it, vi } from 'vitest';
import { Body, Composite, Events } from 'matter-js';
import { ChickCannonEngine } from './engine';
import { STAGES } from './stages';
import { CHICK_FORMS, STAGE_ORDER } from './constants';
import type { GameSnapshot, GameStage, SpawnSpec } from './types';

type TestBody = Matter.Body & { customData?: { projectile?: 'shell'|'feather'; hp?: number } };
interface CampaignHarness {
  stage: GameStage;
  engine: Matter.Engine;
  bodies: Map<number, TestBody>;
  activeChick: TestBody | null;
  loadStage(stage: GameStage): void;
  spawn(spec: SpawnSpec): void;
  publish(): void;
}
const createdEngines: ChickCannonEngine[] = [];
afterEach(() => createdEngines.splice(0).forEach((engine) => engine.dispose()));

function createEngine(stage: GameStage = 1) {
  let current: GameSnapshot | undefined;
  const onSnapshot = vi.fn((snapshot: GameSnapshot) => {
    current = snapshot;
  });
  const engine = new ChickCannonEngine(onSnapshot);
  createdEngines.push(engine);
  const harness = engine as unknown as CampaignHarness;
  if (stage !== 1) {
    harness.stage = stage;
    harness.loadStage(stage);
    harness.publish();
  }
  const snapshot = () => current as GameSnapshot;
  return { engine, onSnapshot, snapshot, harness };
}

describe('ChickCannonEngine', () => {
  it.each(STAGE_ORDER)('uses the form power and skill for level %s', (stage) => {
    const { engine, harness, snapshot } = createEngine(stage);
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    const bird = harness.activeChick!;
    const form = CHICK_FORMS[stage];
    expect(bird.velocity.x).toBeCloseTo(form.launchPower);
    expect(bird.density).toBeCloseTo(form.density);
    engine.activateSkill();
    const auxiliaries = snapshot().entities.filter((entity) => entity.projectile);
    if (form.skillKind === 'shell') expect(auxiliaries).toHaveLength(3);
    else if (form.skillKind === 'feathers') expect(auxiliaries).toHaveLength(7);
    else if (form.skillKind === 'boost') expect(bird.velocity.x).toBeCloseTo(form.launchPower * 1.6);
    else expect(bird.velocity.y).toBeCloseTo(28);
    const count = snapshot().entities.length;
    engine.activateSkill();
    expect(snapshot().entities).toHaveLength(count);
  });

  it.each([1, 6] as const)('expires supplementary projectiles and clears them on retry in level %s', (stage) => {
    const { engine, harness, snapshot } = createEngine(stage);
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.engine.gravity.y = 0;
    harness.spawn({ kind: 'cat', x: 1000, y: 100, hp: 1000 });
    const cat = [...harness.bodies.values()][0];
    Body.setStatic(cat, true);
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    engine.activateSkill();
    const bird = harness.activeChick!;
    const children = [...harness.bodies.values()].filter((body) => body.customData?.projectile);
    expect(children.length).toBe(stage === 1 ? 3 : 7);
    expect(children.every((body) => body.collisionFilter.group === bird.collisionFilter.group && body.collisionFilter.group! < 0)).toBe(true);
    for (let frame = 0; frame < 200; frame += 1) engine.step(16.667);
    expect(snapshot().entities.some((entity) => entity.projectile)).toBe(false);
    expect(children.every((body) => !harness.bodies.has(body.id))).toBe(true);
    engine.retryStage();
    expect(snapshot().entities.some((entity) => entity.projectile)).toBe(false);
  });

  it.each(STAGE_ORDER)('uses form damage rather than the level number in level %s', (stage) => {
    const { engine, harness } = createEngine(stage);
    Composite.clear(harness.engine.world, false, true);
    harness.bodies.clear();
    harness.spawn({ kind: 'cat', x: 900, y: 350, hp: 1000 });
    const cat = [...harness.bodies.values()][0];
    engine.dismissDialogue();
    engine.setAim({ x: 35, y: 525 });
    engine.releaseAim();
    const bird = harness.activeChick!;
    Body.setPosition(bird, { x: 870, y: 350 });
    Body.setVelocity(bird, { x: 4, y: 0 });
    Events.trigger(harness.engine, 'collisionStart', { pairs: [{ bodyA: cat, bodyB: bird, collision: { supports: [] } }] });
    expect(cat.customData?.hp).toBeCloseTo(1000 - 4 * 3.5 * CHICK_FORMS[stage].damageMultiplier);
  });

  it('progresses through all six levels and opens the ending only after the last one', () => {
    const { engine, harness, snapshot } = createEngine();
    for (const stage of STAGE_ORDER) {
      expect(snapshot().stage).toBe(stage);
      expect(snapshot().campaignComplete).toBe(false);
      engine.dismissDialogue();
      engine.setAim({ x: 35, y: 525 });
      engine.releaseAim();
      for (const body of harness.bodies.values()) {
        if (body.label === 'enemy') {
          Composite.remove(harness.engine.world, body);
          harness.bodies.delete(body.id);
        }
      }
      Body.setPosition(harness.activeChick!, { x: 1600, y: 300 });
      Body.setVelocity(harness.activeChick!, { x: 0, y: 0 });
      for (let frame = 0; frame < 100; frame += 1) engine.step(16.667);
      expect(snapshot().state).toBe(stage === 6 ? 'ENDING' : 'EVOLUTION');
      expect(snapshot().campaignComplete).toBe(stage === 6);
      if (stage < 6) {
        expect(snapshot().evolvedForm?.stage).toBe(stage + 1);
        engine.continueAfterEvolution();
      }
    }
    engine.continueAfterEvolution();
    expect(snapshot().stage).toBe(6);
  });

  it('starts the campaign in dialogue and launches with clamped drag power', () => {
    const { engine, snapshot } = createEngine();
    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().ammo).toBe(STAGES[1].ammo);

    engine.dismissDialogue();
    engine.setAim({ x: -400, y: 525 });
    expect(snapshot().aimPosition).toEqual({ x: 35, y: 525 });
    engine.releaseAim();
    expect(snapshot().state).toBe('FLYING');
    expect(snapshot().ammo).toBe(3);
    expect(snapshot().entities.some((entity) => entity.kind === 'chick')).toBe(true);
    engine.dispose();
  });

  it('rejects a short launch and allows a skill only once per shot', () => {
    const { engine, snapshot } = createEngine();
    engine.dismissDialogue();
    engine.setAim({ x: 150, y: 525 });
    engine.releaseAim();
    expect(snapshot().state).toBe('AIMING');
    expect(snapshot().ammo).toBe(4);

    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    const entitiesBeforeSkill = snapshot().entities.length;
    engine.activateSkill();
    const entitiesAfterSkill = snapshot().entities.length;
    engine.activateSkill();
    expect(entitiesAfterSkill - entitiesBeforeSkill).toBe(3);
    expect(snapshot().entities).toHaveLength(entitiesAfterSkill);
    engine.dispose();
  });

  it('enforces item state and quantity gates, and restarts the campaign cleanly', () => {
    const { engine, snapshot } = createEngine();
    engine.useItem('booster');
    engine.useItem('mega');
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1, butter: 1 });
    engine.dismissDialogue();
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(0);
    engine.useItem('mega');
    expect(snapshot().items.mega).toBe(0);
    engine.restartCampaign();
    expect(snapshot().stage).toBe(1);
    expect(snapshot().state).toBe('DIALOGUE');
    expect(snapshot().score).toBe(0);
    expect(snapshot().items).toEqual({ booster: 1, quake: 1, mega: 1, butter: 1 });
    engine.dispose();
  });

  it('retains spent items and campaign score across a stage retry', () => {
    const { engine, snapshot } = createEngine();
    engine.dismissDialogue();
    engine.useItem('quake');
    engine.retryStage();
    expect(snapshot().stage).toBe(1);
    expect(snapshot().ammo).toBe(4);
    expect(snapshot().items.quake).toBe(0);
    engine.dispose();
  });

  it('freezes the simulation and restores the prior active state on resume', () => {
    const { engine, snapshot, onSnapshot } = createEngine();
    engine.dismissDialogue();
    engine.setAim({ x: 80, y: 500 });
    engine.releaseAim();
    engine.step(16.667);
    const before = snapshot();
    engine.pause();
    expect(snapshot().state).toBe('PAUSED');
    const publishCount = onSnapshot.mock.calls.length;
    engine.useItem('quake');
    engine.setAim({ x: 30, y: 300 });
    engine.releaseAim();
    engine.activateSkill();
    engine.step(33.333);
    expect(snapshot().items.quake).toBe(1);
    expect(snapshot().entities).toEqual(before.entities);
    expect(onSnapshot).toHaveBeenCalledTimes(publishCount);
    engine.resume();
    expect(snapshot().state).toBe('FLYING');
    engine.pause();
    engine.retryStage();
    expect(snapshot().state).toBe('DIALOGUE');
    engine.dispose();
  });
});
